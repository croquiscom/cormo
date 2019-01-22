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

    let user1_id;
    let user2_id;
    try {
      const user1 = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
      user1_id = user1.id;
      const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx });
      user2_id = user2.id;

      await tx.commit();
    } finally {
      try { await tx.rollback(); } catch (error) { /**/ }
    }

    const users = await models.User.where();
    expect(users).to.eql([
      { id: user1_id, name: 'John Doe', age: 27 },
      { id: user2_id, name: 'Bill Smith', age: 45 },
    ]);
  });

  it('transaction fail', async () => {
    const tx = await models.connection!.getTransaction();

    try {
      const user1 = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
      const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx });

      await tx.rollback();
    } finally {
      try { await tx.rollback(); } catch (error) { /**/ }
    }

    const users = await models.User.where();
    expect(users).to.eql([]);
  });

  it('normal operation inside transaction', async () => {
    const tx = await models.connection!.getTransaction();

    let user3_id;
    try {
      const user1 = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
      const user3 = await models.User.create({ name: 'Alice Jackson', age: 27 });
      user3_id = user3.id;
      const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx });

      await tx.rollback();
    } finally {
      try { await tx.rollback(); } catch (error) { /**/ }
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
        try { await tx1.rollback(); } catch (error) { /**/ }
        try { await tx2.rollback(); } catch (error) { /**/ }
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
        try { await tx1.rollback(); } catch (error) { /**/ }
        try { await tx2.rollback(); } catch (error) { /**/ }
      }
    });

    it('repeatable read', async () => {
      if (!models.connection!.adapter.support_isolation_level_repeatable_read) {
        return;
      }
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

        models.User.find(user2.id).transaction(tx1).update({ age: 55 });
        expect(await models.User.where().order('id').transaction(tx1)).to.eql([
          { id: user1.id, name: 'John Doe', age: 27 },
          { id: user2.id, name: 'Bill Smith', age: 55 },
        ]);

        await tx1.commit();

        expect(await models.User.where().order('id')).to.eql([
          { id: user1.id, name: 'John Doe', age: 30 },
          { id: user2.id, name: 'Bill Smith', age: 55 },
        ]);
      } finally {
        try { await tx1.rollback(); } catch (error) { /**/ }
        try { await tx2.rollback(); } catch (error) { /**/ }
      }
    });
  });

  describe('various path', () => {
    it('Model.create', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.where().transaction(tx)).to.eql([
          { id: user.id, name: 'John Doe', age: 27 },
        ]);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.createBulk', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const users = await models.User.createBulk([
          { name: 'John Doe', age: 27 },
        ], { transaction: tx });
        expect(await models.User.where().transaction(tx)).to.eql([
          { id: users[0].id, name: 'John Doe', age: 27 },
        ]);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model::save', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await new models.User();
        user.name = 'John Doe';
        user.age = 27;
        await user.save({ transaction: tx });
        expect(await models.User.where().transaction(tx)).to.eql([
          { id: user.id, name: 'John Doe', age: 27 },
        ]);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.count', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.count(undefined, { transaction: tx })).to.eql(1);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.update', async () => {
      const user = await models.User.create({ name: 'John Doe', age: 27 });

      const tx = await models.connection!.getTransaction();

      try {
        await models.User.update({ age: 30 }, undefined, { transaction: tx });
        expect(await models.User.where().transaction(tx)).to.eql([
          { id: user.id, name: 'John Doe', age: 30 },
        ]);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([
        { id: user.id, name: 'John Doe', age: 27 },
      ]);
    });

    it('Model.delete', async () => {
      const user = await models.User.create({ name: 'John Doe', age: 27 });

      const tx = await models.connection!.getTransaction();

      try {
        await models.User.delete(undefined, { transaction: tx });
        expect(await models.User.where().transaction(tx)).to.eql([]);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([
        { id: user.id, name: 'John Doe', age: 27 },
      ]);
    });

    it('Model.query', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.query({ transaction: tx })).to.eql([
          { id: user.id, name: 'John Doe', age: 27 },
        ]);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.find', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.find(user.id, { transaction: tx })).to.eql(
          { id: user.id, name: 'John Doe', age: 27 },
        );
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.findPreserve', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.findPreserve([user.id], { transaction: tx })).to.eql([
          { id: user.id, name: 'John Doe', age: 27 },
        ]);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.where', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.where({ age: 27 }, { transaction: tx })).to.eql([
          { id: user.id, name: 'John Doe', age: 27 },
        ]);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.select', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.select('name', { transaction: tx })).to.eql([
          { id: user.id, name: 'John Doe' },
        ]);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.order', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.order('name', { transaction: tx })).to.eql([
          { id: user.id, name: 'John Doe', age: 27 },
        ]);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Model.group', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.group(null, { sum: { $sum: '$age' } }, { transaction: tx })).to.eql([
          { sum: 27 },
        ]);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Query::exec', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.query({ transaction: tx }).where({ age: 27 })).to.eql([
          { id: user.id, name: 'John Doe', age: 27 },
        ]);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Query::count', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.query({ transaction: tx }).count()).to.eql(1);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([]);
    });

    it('Query::update', async () => {
      const user = await models.User.create({ name: 'John Doe', age: 27 });

      const tx = await models.connection!.getTransaction();

      try {
        await models.User.query({ transaction: tx }).update({ age: 30 });
        expect(await models.User.where().transaction(tx)).to.eql([
          { id: user.id, name: 'John Doe', age: 30 },
        ]);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([
        { id: user.id, name: 'John Doe', age: 27 },
      ]);
    });

    it('Query::delete', async () => {
      const user = await models.User.create({ name: 'John Doe', age: 27 });

      const tx = await models.connection!.getTransaction();

      try {
        await models.User.query({ transaction: tx }).delete({ age: 27 });
        expect(await models.User.where().transaction(tx)).to.eql([]);
        await tx.rollback();
      } finally {
        try { await tx.rollback(); } catch (error) { /**/ }
      }

      expect(await models.User.where()).to.eql([
        { id: user.id, name: 'John Doe', age: 27 },
      ]);
    });
  });
}
