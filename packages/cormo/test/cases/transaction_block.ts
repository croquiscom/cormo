import { expect } from 'chai';
import * as cormo from '../../lib/esm/index.js';

import { UserRef } from './transaction.js';

export default function (models: { User: typeof UserRef; connection: cormo.Connection | null }) {
  it('transaction success', async () => {
    const [user1_id, user2_id] = await models.connection!.transaction(async (tx) => {
      const user1 = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
      const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx });
      return [user1.id, user2.id];
    });

    const users = await models.User.where();
    expect(users).to.eql([
      { id: user1_id, name: 'John Doe', age: 27 },
      { id: user2_id, name: 'Bill Smith', age: 45 },
    ]);
  });

  it('transaction fail', async () => {
    try {
      await models.connection!.transaction(async (tx) => {
        const _user1 = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        const _user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx });
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
    let tx;
    try {
      await models.connection!.transaction((_tx) => {
        tx = _tx;
        throw new Error('force fail');
      });
    } catch {
      //
    }

    try {
      await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.equal('transaction finished');
    }
  });

  it('normal operation inside transaction', async () => {
    let user3_id;
    try {
      await models.connection!.transaction(async (tx) => {
        const _user1 = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        const user3 = await models.User.create({ name: 'Alice Jackson', age: 27 });
        user3_id = user3.id;
        const _user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx });
        throw new Error('force fail');
      });
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error.message).to.equal('force fail');
    }

    const users = await models.User.where();
    expect(users).to.eql([{ id: user3_id, name: 'Alice Jackson', age: 27 }]);
  });

  describe('isolation levels', () => {
    it('read uncommited', async () => {
      if (!(models.connection!.adapter as any).support_isolation_level_read_uncommitted) {
        return;
      }
      const user1 = await models.User.create({ name: 'John Doe', age: 27 });

      await models.connection!.transaction({ isolation_level: cormo.IsolationLevel.READ_UNCOMMITTED }, async (tx1) => {
        let user2_id;

        await models.connection!.transaction(async (tx2) => {
          const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx2 });
          user2_id = user2.id;
          await models.User.find(user1.id).transaction(tx2).update({ age: 30 });

          expect(await models.User.where().transaction(tx1)).to.eql([
            { id: user1.id, name: 'John Doe', age: 30 },
            { id: user2.id, name: 'Bill Smith', age: 45 },
          ]);
        });

        expect(await models.User.where().order('id').transaction(tx1)).to.eql([
          { id: user1.id, name: 'John Doe', age: 30 },
          { id: user2_id, name: 'Bill Smith', age: 45 },
        ]);
      });
    });

    it('read commited', async () => {
      const user1 = await models.User.create({ name: 'John Doe', age: 27 });

      await models.connection!.transaction({ isolation_level: cormo.IsolationLevel.READ_COMMITTED }, async (tx1) => {
        let user2_id;

        await models.connection!.transaction(async (tx2) => {
          const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx2 });
          user2_id = user2.id;
          await models.User.find(user1.id).transaction(tx2).update({ age: 30 });

          expect(await models.User.where().transaction(tx1)).to.eql([{ id: user1.id, name: 'John Doe', age: 27 }]);
        });

        expect(await models.User.where().order('id').transaction(tx1)).to.eql([
          { id: user1.id, name: 'John Doe', age: 30 },
          { id: user2_id, name: 'Bill Smith', age: 45 },
        ]);
      });
    });

    it('repeatable read', async () => {
      if (!(models.connection!.adapter as any).support_isolation_level_repeatable_read) {
        return;
      }
      const user1 = await models.User.create({ name: 'John Doe', age: 27 });
      let user2_id: any;

      await models.connection!.transaction({ isolation_level: cormo.IsolationLevel.REPEATABLE_READ }, async (tx1) => {
        await models.connection!.transaction(async (tx2) => {
          const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx2 });
          user2_id = user2.id;
          await models.User.find(user1.id).transaction(tx2).update({ age: 30 });

          expect(await models.User.where().transaction(tx1)).to.eql([{ id: user1.id, name: 'John Doe', age: 27 }]);
        });

        expect(await models.User.where().order('id').transaction(tx1)).to.eql([
          { id: user1.id, name: 'John Doe', age: 27 },
        ]);

        models.User.find(user2_id).transaction(tx1).update({ age: 55 });
        expect(await models.User.where().order('id').transaction(tx1)).to.eql([
          { id: user1.id, name: 'John Doe', age: 27 },
          { id: user2_id, name: 'Bill Smith', age: 55 },
        ]);
      });

      expect(await models.User.where().order('id')).to.eql([
        { id: user1.id, name: 'John Doe', age: 30 },
        { id: user2_id, name: 'Bill Smith', age: 55 },
      ]);
    });
  });

  describe('various path', () => {
    it('Model.create', async () => {
      try {
        await models.connection!.transaction(async (tx) => {
          const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
          expect(await models.User.where().transaction(tx)).to.eql([{ id: user.id, name: 'John Doe', age: 27 }]);
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
        await models.connection!.transaction(async (tx) => {
          const users = await models.User.createBulk([{ name: 'John Doe', age: 27 }], { transaction: tx });
          expect(await models.User.where().transaction(tx)).to.eql([{ id: users[0].id, name: 'John Doe', age: 27 }]);
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
        await models.connection!.transaction(async (tx) => {
          const user = new models.User();
          user.name = 'John Doe';
          user.age = 27;
          await user.save({ transaction: tx });
          expect(await models.User.where().transaction(tx)).to.eql([{ id: user.id, name: 'John Doe', age: 27 }]);
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
        await models.connection!.transaction(async (tx) => {
          const _user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
          expect(await models.User.count(undefined, { transaction: tx })).to.eql(1);
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
        await models.connection!.transaction(async (tx) => {
          await models.User.update({ age: 30 }, undefined, { transaction: tx });
          expect(await models.User.where().transaction(tx)).to.eql([{ id: user.id, name: 'John Doe', age: 30 }]);
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
        await models.connection!.transaction(async (tx) => {
          await models.User.delete(undefined, { transaction: tx });
          expect(await models.User.where().transaction(tx)).to.eql([]);
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
        await models.connection!.transaction(async (tx) => {
          const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
          expect(await models.User.query({ transaction: tx })).to.eql([{ id: user.id, name: 'John Doe', age: 27 }]);
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
        await models.connection!.transaction(async (tx) => {
          const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
          expect(await models.User.find(user.id, { transaction: tx })).to.eql({
            id: user.id,
            name: 'John Doe',
            age: 27,
          });
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
        await models.connection!.transaction(async (tx) => {
          const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
          expect(await models.User.findPreserve([user.id], { transaction: tx })).to.eql([
            { id: user.id, name: 'John Doe', age: 27 },
          ]);
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
        await models.connection!.transaction(async (tx) => {
          const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
          expect(await models.User.where({ age: 27 }, { transaction: tx })).to.eql([
            { id: user.id, name: 'John Doe', age: 27 },
          ]);
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
        await models.connection!.transaction(async (tx) => {
          const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
          expect(await models.User.select('name', { transaction: tx })).to.eql([{ id: user.id, name: 'John Doe' }]);
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
        await models.connection!.transaction(async (tx) => {
          const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
          expect(await models.User.order('name', { transaction: tx })).to.eql([
            { id: user.id, name: 'John Doe', age: 27 },
          ]);
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
        await models.connection!.transaction(async (tx) => {
          const _user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
          expect(await models.User.group(null, { sum: { $sum: '$age' } }, { transaction: tx })).to.eql([{ sum: 27 }]);
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
        await models.connection!.transaction(async (tx) => {
          const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
          expect(await models.User.query({ transaction: tx }).where({ age: 27 })).to.eql([
            { id: user.id, name: 'John Doe', age: 27 },
          ]);
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
        await models.connection!.transaction(async (tx) => {
          const _user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
          expect(await models.User.query({ transaction: tx }).count()).to.eql(1);
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
        await models.connection!.transaction(async (tx) => {
          await models.User.query({ transaction: tx }).update({ age: 30 });
          expect(await models.User.where().transaction(tx)).to.eql([{ id: user.id, name: 'John Doe', age: 30 }]);
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
        await models.connection!.transaction(async (tx) => {
          await models.User.query({ transaction: tx }).delete({ age: 27 });
          expect(await models.User.where().transaction(tx)).to.eql([]);
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
