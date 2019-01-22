// tslint:disable:variable-name

import { expect } from 'chai';
import * as cormo from '../..';

import { UserRef, UserRefVO } from './query';

export default function(models: {
  User: typeof UserRef,
  connection: cormo.Connection | null,
}) {
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
        const user1 = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx });
        throw new Error('force fail');
      });
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error.message).to.equal('force fail');
    }

    const users = await models.User.where();
    expect(users).to.eql([]);
  });

  it('normal operation inside transaction', async () => {
    let user3_id;
    try {
      await models.connection!.transaction(async (tx) => {
        const user1 = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        const user3 = await models.User.create({ name: 'Alice Jackson', age: 27 });
        user3_id = user3.id;
        const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx });
        throw new Error('force fail');
      });
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error.message).to.equal('force fail');
    }

    const users = await models.User.where();
    expect(users).to.eql([
      { id: user3_id, name: 'Alice Jackson', age: 27 },
    ]);
  });

  describe('isolation levels', () => {
    it('read uncommited', async () => {
      if (!models.connection!.adapter.support_isolation_level_read_uncommitted) {
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

          expect(await models.User.where().transaction(tx1)).to.eql([
            { id: user1.id, name: 'John Doe', age: 27 },
          ]);
        });

        expect(await models.User.where().order('id').transaction(tx1)).to.eql([
          { id: user1.id, name: 'John Doe', age: 30 },
          { id: user2_id, name: 'Bill Smith', age: 45 },
        ]);
      });
    });

    it('repeatable read', async () => {
      if (!models.connection!.adapter.support_isolation_level_repeatable_read) {
        return;
      }
      const user1 = await models.User.create({ name: 'John Doe', age: 27 });
      let user2_id: any;

      await models.connection!.transaction({ isolation_level: cormo.IsolationLevel.REPEATABLE_READ }, async (tx1) => {
        await models.connection!.transaction(async (tx2) => {
          const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx2 });
          user2_id = user2.id;
          await models.User.find(user1.id).transaction(tx2).update({ age: 30 });

          expect(await models.User.where().transaction(tx1)).to.eql([
            { id: user1.id, name: 'John Doe', age: 27 },
          ]);
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
          expect(await models.User.where().transaction(tx)).to.eql([
            { id: user.id, name: 'John Doe', age: 27 },
          ]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.createBulk', async () => {
      try {
        await models.connection!.transaction(async (tx) => {
          const users = await models.User.createBulk([{ name: 'John Doe', age: 27 }], { transaction: tx });
          expect(await models.User.where().transaction(tx)).to.eql([
            { id: users[0].id, name: 'John Doe', age: 27 },
          ]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model::save', async () => {
      try {
        await models.connection!.transaction(async (tx) => {
          const user = await new models.User();
          user.name = 'John Doe';
          user.age = 27;
          await user.save({ transaction: tx });
          expect(await models.User.where().transaction(tx)).to.eql([
            { id: user.id, name: 'John Doe', age: 27 },
          ]);
          throw new Error('force fail');
        });
        throw new Error('must throw an error.');
      } catch (error) {
        expect(error.message).to.equal('force fail');
      }

      expect(await models.User.where()).to.eql([]);
    });
  });
}
