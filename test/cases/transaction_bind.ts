// tslint:disable:variable-name

import { expect } from 'chai';
import * as cormo from '../..';

import { UserRef, UserRefVO } from './query';

export default function(models: {
  User: typeof UserRef,
  connection: cormo.Connection | null,
}) {
  it('transaction success', async () => {
    const [user1_id, user2_id] = await models.connection!.transaction<[number, number], UserRef>(
      { models: [models.User] },
      async (TxUser) => {
        const user1 = await TxUser.create({ name: 'John Doe', age: 27 });
        const user2 = await TxUser.create({ name: 'Bill Smith', age: 45 });
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
      await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
        const user1 = await TxUser.create({ name: 'John Doe', age: 27 });
        const user2 = await TxUser.create({ name: 'Bill Smith', age: 45 });
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
      await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser) => {
        const user1 = await TxUser.create({ name: 'John Doe', age: 27 });
        const user3 = await models.User.create({ name: 'Alice Jackson', age: 27 });
        user3_id = user3.id;
        const user2 = await TxUser.create({ name: 'Bill Smith', age: 45 });
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
        });
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

            expect(await TxUser1.where()).to.eql([
              { id: user1.id, name: 'John Doe', age: 27 },
            ]);
          });

          expect(await TxUser1.where().order('id')).to.eql([
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

      await models.connection!.transaction<void, UserRef>(
        { isolation_level: cormo.IsolationLevel.REPEATABLE_READ, models: [models.User] },
        async (TxUser1) => {
          await models.connection!.transaction<void, UserRef>({ models: [models.User] }, async (TxUser2) => {
            const user2 = await TxUser2.create({ name: 'Bill Smith', age: 45 });
            user2_id = user2.id;
            await TxUser2.find(user1.id).update({ age: 30 });

            expect(await TxUser1.where()).to.eql([
              { id: user1.id, name: 'John Doe', age: 27 },
            ]);
          });

          expect(await TxUser1.where().order('id')).to.eql([
            { id: user1.id, name: 'John Doe', age: 27 },
          ]);

          TxUser1.find(user2_id).update({ age: 55 });
          expect(await TxUser1.where().order('id')).to.eql([
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
}
