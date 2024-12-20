import { expect } from 'chai';
import * as cormo from '../../src/index.js';

import { UserExtraRef, UserRef } from './transaction.js';

export default function (models: {
  User: typeof UserRef;
  UserExtra: typeof UserExtraRef;
  connection: cormo.Connection | null;
}) {
  it('transaction success', async () => {
    const [user1_id, user2_id] = await models.connection!.transaction<[number, number], UserRef>(
      { models: [models.User] },
      async (TxUser) => {
        const user1 = await TxUser.create({ name: 'John Doe', age: 27 });
        const user2 = await TxUser.create({ name: 'Bill Smith', age: 45 });
        return [user1.id, user2.id];
      },
    );

    const users = await models.User.where();
    expect(users).to.eql([
      { id: user1_id, name: 'John Doe', age: 27 },
      { id: user2_id, name: 'Bill Smith', age: 45 },
    ]);
  });

  it('transaction fail', async () => {
    try {
      await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
        const _user1 = await TxUser.create({ name: 'John Doe', age: 27 });
        const _user2 = await TxUser.create({ name: 'Bill Smith', age: 45 });
        throw new Error('force fail');
      });
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error.message).to.equal('force fail');
    }

    const users = await models.User.where();
    expect(users).to.eql([]);
  });

  it('can not run command with finished transaction', async () => {
    let TxUser: any;
    try {
      await models.connection!.transaction<void, UserRef>({ models: [models.User] }, (_TxUser) => {
        TxUser = _TxUser;
        throw new Error('force fail');
      });
    } catch {
      //
    }

    try {
      await TxUser.create({ name: 'John Doe', age: 27 });
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.equal('transaction finished');
    }
  });

  it('normal operation inside transaction', async () => {
    let user3_id;
    try {
      await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
        const _user1 = await TxUser.create({ name: 'John Doe', age: 27 });
        const user3 = await models.User.create({ name: 'Alice Jackson', age: 27 });
        user3_id = user3.id;
        const _user2 = await TxUser.create({ name: 'Bill Smith', age: 45 });
        throw new Error('force fail');
      });
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error.message).to.equal('force fail');
    }

    const users = await models.User.where();
    expect(users).to.eql([{ id: user3_id, name: 'Alice Jackson', age: 27 }]);
  });

  it('multiple model', async () => {
    let user_id;
    let user_extra2_id;
    try {
      await models.connection!.transaction<void, UserRef, UserExtraRef>(
        { models: [models.User, models.UserExtra] },
        async (TxUser, TxUserExtra) => {
          const user = await TxUser.create({ name: 'John Doe', age: 27 });
          user_id = user.id;
          const user_extra1 = await TxUserExtra.create({ user_id: user.id, phone_number: '1234-5678' });
          const user_extra2 = await models.UserExtra.create({ user_id: user.id, phone_number: '9876-5432' });
          user_extra2_id = user_extra2.id;
          expect(await TxUserExtra.where()).to.eql([
            { id: user_extra1.id, user_id, phone_number: '1234-5678' },
            { id: user_extra2_id, user_id, phone_number: '9876-5432' },
          ]);
          throw new Error('force fail');
        },
      );
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error.message).to.equal('force fail');
    }

    expect(await models.User.where()).to.eql([]);
    expect(await models.UserExtra.where()).to.eql([{ id: user_extra2_id, user_id, phone_number: '9876-5432' }]);
  });

  describe('isolation levels', () => {
    it('read uncommited', async () => {
      if (!(models.connection!.adapter as any).support_isolation_level_read_uncommitted) {
        return;
      }
      const user1 = await models.User.create({ name: 'John Doe', age: 27 });

      await models.connection!.transaction<void, UserRef>(
        { isolation_level: cormo.IsolationLevel.READ_UNCOMMITTED, models: [models.User] },
        async (TxUser1) => {
          let user2_id;

          await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser2) => {
            const user2 = await TxUser2.create({ name: 'Bill Smith', age: 45 });
            user2_id = user2.id;
            await TxUser2.find(user1.id).update({ age: 30 });

            expect(await TxUser1.where()).to.eql([
              { id: user1.id, name: 'John Doe', age: 30 },
              { id: user2.id, name: 'Bill Smith', age: 45 },
            ]);
          });

          expect(await TxUser1.where().order('id')).to.eql([
            { id: user1.id, name: 'John Doe', age: 30 },
            { id: user2_id, name: 'Bill Smith', age: 45 },
          ]);
        },
      );
    });

    it('read commited', async () => {
      const user1 = await models.User.create({ name: 'John Doe', age: 27 });

      await models.connection!.transaction<void, UserRef>(
        { isolation_level: cormo.IsolationLevel.READ_COMMITTED, models: [models.User] },
        async (TxUser1) => {
          let user2_id;

          await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser2) => {
            const user2 = await TxUser2.create({ name: 'Bill Smith', age: 45 });
            user2_id = user2.id;
            await TxUser2.find(user1.id).update({ age: 30 });

            expect(await TxUser1.where()).to.eql([{ id: user1.id, name: 'John Doe', age: 27 }]);
          });

          expect(await TxUser1.where().order('id')).to.eql([
            { id: user1.id, name: 'John Doe', age: 30 },
            { id: user2_id, name: 'Bill Smith', age: 45 },
          ]);
        },
      );
    });

    it('repeatable read', async () => {
      if (!(models.connection!.adapter as any).support_isolation_level_repeatable_read) {
        return;
      }
      const user1 = await models.User.create({ name: 'John Doe', age: 27 });
      let user2_id: any;

      await models.connection!.transaction<void, UserRef>(
        { isolation_level: cormo.IsolationLevel.REPEATABLE_READ, models: [models.User] },
        async (TxUser1) => {
          await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser2) => {
            const user2 = await TxUser2.create({ name: 'Bill Smith', age: 45 });
            user2_id = user2.id;
            await TxUser2.find(user1.id).update({ age: 30 });

            expect(await TxUser1.where()).to.eql([{ id: user1.id, name: 'John Doe', age: 27 }]);
          });

          expect(await TxUser1.where().order('id')).to.eql([{ id: user1.id, name: 'John Doe', age: 27 }]);

          TxUser1.find(user2_id).update({ age: 55 });
          expect(await TxUser1.where().order('id')).to.eql([
            { id: user1.id, name: 'John Doe', age: 27 },
            { id: user2_id, name: 'Bill Smith', age: 55 },
          ]);
        },
      );

      expect(await models.User.where().order('id')).to.eql([
        { id: user1.id, name: 'John Doe', age: 30 },
        { id: user2_id, name: 'Bill Smith', age: 55 },
      ]);
    });
  });

  describe('various path', () => {
    it('Model.create', async () => {
      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          const user = await TxUser.create({ name: 'John Doe', age: 27 });
          expect(await TxUser.where()).to.eql([{ id: user.id, name: 'John Doe', age: 27 }]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.createBulk', async () => {
      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          const users = await TxUser.createBulk([{ name: 'John Doe', age: 27 }]);
          expect(await TxUser.where()).to.eql([{ id: users[0].id, name: 'John Doe', age: 27 }]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model::save', async () => {
      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          const user = new TxUser();
          user.name = 'John Doe';
          user.age = 27;
          await user.save();
          expect(await TxUser.where()).to.eql([{ id: user.id, name: 'John Doe', age: 27 }]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.count', async () => {
      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          const _user = await TxUser.create({ name: 'John Doe', age: 27 });
          expect(await TxUser.count()).to.eql(1);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.update', async () => {
      const user = await models.User.create({ name: 'John Doe', age: 27 });

      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          await TxUser.update({ age: 30 });
          expect(await TxUser.where()).to.eql([{ id: user.id, name: 'John Doe', age: 30 }]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([{ id: user.id, name: 'John Doe', age: 27 }]);
    });

    it('Model.delete', async () => {
      const user = await models.User.create({ name: 'John Doe', age: 27 });

      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          await TxUser.delete();
          expect(await TxUser.where()).to.eql([]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([{ id: user.id, name: 'John Doe', age: 27 }]);
    });

    it('Model.query', async () => {
      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          const user = await TxUser.create({ name: 'John Doe', age: 27 });
          expect(await TxUser.query()).to.eql([{ id: user.id, name: 'John Doe', age: 27 }]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.find', async () => {
      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          const user = await TxUser.create({ name: 'John Doe', age: 27 });
          expect(await TxUser.find(user.id)).to.eql({ id: user.id, name: 'John Doe', age: 27 });
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.findPreserve', async () => {
      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          const user = await TxUser.create({ name: 'John Doe', age: 27 });
          expect(await TxUser.findPreserve([user.id])).to.eql([{ id: user.id, name: 'John Doe', age: 27 }]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.where', async () => {
      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          const user = await TxUser.create({ name: 'John Doe', age: 27 });
          expect(await TxUser.where({ age: 27 })).to.eql([{ id: user.id, name: 'John Doe', age: 27 }]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.select', async () => {
      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          const user = await TxUser.create({ name: 'John Doe', age: 27 });
          expect(await TxUser.select('name')).to.eql([{ id: user.id, name: 'John Doe' }]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.order', async () => {
      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          const user = await TxUser.create({ name: 'John Doe', age: 27 });
          expect(await TxUser.order('name')).to.eql([{ id: user.id, name: 'John Doe', age: 27 }]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.group', async () => {
      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          const _user = await TxUser.create({ name: 'John Doe', age: 27 });
          expect(await TxUser.group(null, { sum: { $sum: '$age' } })).to.eql([{ sum: 27 }]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Query::exec', async () => {
      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          const user = await TxUser.create({ name: 'John Doe', age: 27 });
          expect(await TxUser.query().where({ age: 27 })).to.eql([{ id: user.id, name: 'John Doe', age: 27 }]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Query::count', async () => {
      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          const _user = await TxUser.create({ name: 'John Doe', age: 27 });
          expect(await TxUser.query().count()).to.eql(1);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Query::update', async () => {
      const user = await models.User.create({ name: 'John Doe', age: 27 });

      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          await TxUser.query().update({ age: 30 });
          expect(await TxUser.where()).to.eql([{ id: user.id, name: 'John Doe', age: 30 }]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([{ id: user.id, name: 'John Doe', age: 27 }]);
    });

    it('Query::delete', async () => {
      const user = await models.User.create({ name: 'John Doe', age: 27 });

      try {
        await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
          await TxUser.query().delete({ age: 27 });
          expect(await TxUser.where()).to.eql([]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([{ id: user.id, name: 'John Doe', age: 27 }]);
    });
  });
}
