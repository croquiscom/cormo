// tslint:disable:variable-name

import { expect } from 'chai';
import * as cormo from '../..';

import { UserRef, UserRefVO } from './query';

export default function(models: {
  User: typeof UserRef,
  connection: cormo.Connection | null,
}) {
  it('transaction success', async () => {
    const tx = await models.connection!.getTransaction();

    const user1 = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
    const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx });

    await tx.commit();

    const users = await models.User.where();
    expect(users).to.eql([
      { id: user1.id, name: 'John Doe', age: 27 },
      { id: user2.id, name: 'Bill Smith', age: 45 },
    ]);
  });

  it('transaction fail', async () => {
    const tx = await models.connection!.getTransaction();

    const user1 = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
    const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx });

    await tx.rollback();

    const users = await models.User.where();
    expect(users).to.eql([]);
  });

  it('normal operation inside transaction', async () => {
    const tx = await models.connection!.getTransaction();

    const user1 = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
    const user3 = await models.User.create({ name: 'Alice Jackson', age: 27 });
    const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx });

    await tx.rollback();

    const users = await models.User.where();
    expect(users).to.eql([
      { id: user3.id, name: 'Alice Jackson', age: 27 },
    ]);
  });

  describe('isolation levels', () => {
    it('read uncommited', async () => {
      if (!models.connection!.adapter.support_isolation_level_read_uncommitted) {
        return;
      }
      const user1 = await models.User.create({ name: 'John Doe', age: 27 });

      const tx1 = await models.connection!.getTransaction({ isolation_level: cormo.IsolationLevel.READ_UNCOMMITTED });

      const tx2 = await models.connection!.getTransaction();

      try {
        const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx2 });
        await models.User.find(user1.id).transaction(tx2).update({ age: 30 });

        expect(await models.User.where().transaction(tx1)).to.eql([
          { id: user1.id, name: 'John Doe', age: 30 },
          { id: user2.id, name: 'Bill Smith', age: 45 },
        ]);

        await tx2.commit();

        expect(await models.User.where().order('id').transaction(tx1)).to.eql([
          { id: user1.id, name: 'John Doe', age: 30 },
          { id: user2.id, name: 'Bill Smith', age: 45 },
        ]);

        await tx1.commit();
      } finally {
        try {
          await tx1.rollback();
        } catch (error) {
          //
        }
        try {
          await tx2.rollback();
        } catch (error) {
          //
        }
      }
    });

    it('read commited', async () => {
      const user1 = await models.User.create({ name: 'John Doe', age: 27 });

      const tx1 = await models.connection!.getTransaction({ isolation_level: cormo.IsolationLevel.READ_COMMITTED });

      const tx2 = await models.connection!.getTransaction();

      try {
        const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx2 });
        await models.User.find(user1.id).transaction(tx2).update({ age: 30 });

        expect(await models.User.where().transaction(tx1)).to.eql([
          { id: user1.id, name: 'John Doe', age: 27 },
        ]);

        await tx2.commit();

        expect(await models.User.where().order('id').transaction(tx1)).to.eql([
          { id: user1.id, name: 'John Doe', age: 30 },
          { id: user2.id, name: 'Bill Smith', age: 45 },
        ]);

        await tx1.commit();
      } finally {
        try {
          await tx1.rollback();
        } catch (error) {
          //
        }
        try {
          await tx2.rollback();
        } catch (error) {
          //
        }
      }
    });

    it('repeatable read', async () => {
      const user1 = await models.User.create({ name: 'John Doe', age: 27 });

      const tx1 = await models.connection!.getTransaction({ isolation_level: cormo.IsolationLevel.REPEATABLE_READ });

      const tx2 = await models.connection!.getTransaction();

      try {
        const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx2 });
        await models.User.find(user1.id).transaction(tx2).update({ age: 30 });

        expect(await models.User.where().transaction(tx1)).to.eql([
          { id: user1.id, name: 'John Doe', age: 27 },
        ]);

        await tx2.commit();

        expect(await models.User.where().order('id').transaction(tx1)).to.eql([
          { id: user1.id, name: 'John Doe', age: 27 },
        ]);

        // This case is only operated in the mysql
        // models.User.find(user2.id).transaction(tx1).update({ age: 55 });
        // expect(await models.User.where().order('id').transaction(tx1)).to.eql([
        //   { id: user1.id, name: 'John Doe', age: 27 },
        //   { id: user2.id, name: 'Bill Smith', age: 55 },
        // ]);

        await tx1.commit();

        expect(await models.User.where().order('id').transaction(tx1)).to.eql([
          { id: user1.id, name: 'John Doe', age: 30 },
          { id: user2.id, name: 'Bill Smith', age: 45 },
        ]);

      } finally {
        try {
          await tx1.rollback();
        } catch (error) {
          //
        }
        try {
          await tx2.rollback();
        } catch (error) {
          //
        }
      }
    });
  });
}
