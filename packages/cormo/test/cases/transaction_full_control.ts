import { expect, describe, it } from 'vitest';
import * as cormo from '../../src/index.js';

import { UserRef } from './transaction.js';

export default function (models: { User: typeof UserRef; connection: cormo.Connection | null }) {
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
      try {
        await tx.rollback();
      } catch {
        /**/
      }
    }

    const users = await models.User.where();
    expect(users).toEqual([
      { id: user1_id, name: 'John Doe', age: 27 },
      { id: user2_id, name: 'Bill Smith', age: 45 },
    ]);
  });

  it('transaction fail', async () => {
    const tx = await models.connection!.getTransaction();

    try {
      const _user1 = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
      const _user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx });

      await tx.rollback();
    } finally {
      try {
        await tx.rollback();
      } catch {
        /**/
      }
    }

    const users = await models.User.where();
    expect(users).toEqual([]);
  });

  it('can not run command with finished transaction', async () => {
    const tx = await models.connection!.getTransaction();
    await tx.rollback();

    try {
      await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('transaction finished');
    }
  });

  it('normal operation inside transaction', async () => {
    const tx = await models.connection!.getTransaction();

    let user3_id;
    try {
      const _user1 = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
      const user3 = await models.User.create({ name: 'Alice Jackson', age: 27 });
      user3_id = user3.id;
      const _user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx });

      await tx.rollback();
    } finally {
      try {
        await tx.rollback();
      } catch {
        /**/
      }
    }

    const users = await models.User.where();
    expect(users).toEqual([{ id: user3_id, name: 'Alice Jackson', age: 27 }]);
  });

  describe('isolation levels', () => {
    it('read uncommited', async () => {
      if (!(models.connection!.adapter as any).support_isolation_level_read_uncommitted) {
        return;
      }
      const user1 = await models.User.create({ name: 'John Doe', age: 27 });

      const tx1 = await models.connection!.getTransaction({ isolation_level: cormo.IsolationLevel.READ_UNCOMMITTED });

      const tx2 = await models.connection!.getTransaction();

      try {
        const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx2 });
        await models.User.find(user1.id).transaction(tx2).update({ age: 30 });

        expect(await models.User.where().transaction(tx1)).toEqual([
          { id: user1.id, name: 'John Doe', age: 30 },
          { id: user2.id, name: 'Bill Smith', age: 45 },
        ]);

        await tx2.commit();

        expect(await models.User.where().order('id').transaction(tx1)).toEqual([
          { id: user1.id, name: 'John Doe', age: 30 },
          { id: user2.id, name: 'Bill Smith', age: 45 },
        ]);

        await tx1.commit();
      } finally {
        try {
          await tx1.rollback();
        } catch {
          /**/
        }
        try {
          await tx2.rollback();
        } catch {
          /**/
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

        expect(await models.User.where().transaction(tx1)).toEqual([{ id: user1.id, name: 'John Doe', age: 27 }]);

        await tx2.commit();

        expect(await models.User.where().order('id').transaction(tx1)).toEqual([
          { id: user1.id, name: 'John Doe', age: 30 },
          { id: user2.id, name: 'Bill Smith', age: 45 },
        ]);

        await tx1.commit();
      } finally {
        try {
          await tx1.rollback();
        } catch {
          /**/
        }
        try {
          await tx2.rollback();
        } catch {
          /**/
        }
      }
    });

    it('repeatable read', async () => {
      if (!(models.connection!.adapter as any).support_isolation_level_repeatable_read) {
        return;
      }
      const user1 = await models.User.create({ name: 'John Doe', age: 27 });

      const tx1 = await models.connection!.getTransaction({ isolation_level: cormo.IsolationLevel.REPEATABLE_READ });

      const tx2 = await models.connection!.getTransaction();

      try {
        const user2 = await models.User.create({ name: 'Bill Smith', age: 45 }, { transaction: tx2 });
        await models.User.find(user1.id).transaction(tx2).update({ age: 30 });

        expect(await models.User.where().transaction(tx1)).toEqual([{ id: user1.id, name: 'John Doe', age: 27 }]);

        await tx2.commit();

        expect(await models.User.where().order('id').transaction(tx1)).toEqual([
          { id: user1.id, name: 'John Doe', age: 27 },
        ]);

        models.User.find(user2.id).transaction(tx1).update({ age: 55 });
        expect(await models.User.where().order('id').transaction(tx1)).toEqual([
          { id: user1.id, name: 'John Doe', age: 27 },
          { id: user2.id, name: 'Bill Smith', age: 55 },
        ]);

        await tx1.commit();

        expect(await models.User.where().order('id')).toEqual([
          { id: user1.id, name: 'John Doe', age: 30 },
          { id: user2.id, name: 'Bill Smith', age: 55 },
        ]);
      } finally {
        try {
          await tx1.rollback();
        } catch {
          /**/
        }
        try {
          await tx2.rollback();
        } catch {
          /**/
        }
      }
    });
  });

  describe('various path', () => {
    it('Model.create', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.where().transaction(tx)).toEqual([{ id: user.id, name: 'John Doe', age: 27 }]);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([]);
    });

    it('Model.createBulk', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const users = await models.User.createBulk([{ name: 'John Doe', age: 27 }], { transaction: tx });
        expect(await models.User.where().transaction(tx)).toEqual([{ id: users[0].id, name: 'John Doe', age: 27 }]);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([]);
    });

    it('Model::save', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = new models.User();
        user.name = 'John Doe';
        user.age = 27;
        await user.save({ transaction: tx });
        expect(await models.User.where().transaction(tx)).toEqual([{ id: user.id, name: 'John Doe', age: 27 }]);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([]);
    });

    it('Model.count', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const _user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.count(undefined, { transaction: tx })).toEqual(1);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([]);
    });

    it('Model.update', async () => {
      const user = await models.User.create({ name: 'John Doe', age: 27 });

      const tx = await models.connection!.getTransaction();

      try {
        await models.User.update({ age: 30 }, undefined, { transaction: tx });
        expect(await models.User.where().transaction(tx)).toEqual([{ id: user.id, name: 'John Doe', age: 30 }]);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([{ id: user.id, name: 'John Doe', age: 27 }]);
    });

    it('Model.delete', async () => {
      const user = await models.User.create({ name: 'John Doe', age: 27 });

      const tx = await models.connection!.getTransaction();

      try {
        await models.User.delete(undefined, { transaction: tx });
        expect(await models.User.where().transaction(tx)).toEqual([]);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([{ id: user.id, name: 'John Doe', age: 27 }]);
    });

    it('Model.query', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.query({ transaction: tx })).toEqual([{ id: user.id, name: 'John Doe', age: 27 }]);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([]);
    });

    it('Model.find', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.find(user.id, { transaction: tx })).toEqual({
          id: user.id,
          name: 'John Doe',
          age: 27,
        });
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([]);
    });

    it('Model.findPreserve', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.findPreserve([user.id], { transaction: tx })).toEqual([
          { id: user.id, name: 'John Doe', age: 27 },
        ]);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([]);
    });

    it('Model.where', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.where({ age: 27 }, { transaction: tx })).toEqual([
          { id: user.id, name: 'John Doe', age: 27 },
        ]);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([]);
    });

    it('Model.select', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.select('name', { transaction: tx })).toEqual([{ id: user.id, name: 'John Doe' }]);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([]);
    });

    it('Model.order', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.order('name', { transaction: tx })).toEqual([
          { id: user.id, name: 'John Doe', age: 27 },
        ]);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([]);
    });

    it('Model.group', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const _user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.group(null, { sum: { $sum: '$age' } }, { transaction: tx })).toEqual([{ sum: 27 }]);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([]);
    });

    it('Query::exec', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.query({ transaction: tx }).where({ age: 27 })).toEqual([
          { id: user.id, name: 'John Doe', age: 27 },
        ]);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([]);
    });

    it('Query::count', async () => {
      const tx = await models.connection!.getTransaction();

      try {
        const _user = await models.User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
        expect(await models.User.query({ transaction: tx }).count()).toEqual(1);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([]);
    });

    it('Query::update', async () => {
      const user = await models.User.create({ name: 'John Doe', age: 27 });

      const tx = await models.connection!.getTransaction();

      try {
        await models.User.query({ transaction: tx }).update({ age: 30 });
        expect(await models.User.where().transaction(tx)).toEqual([{ id: user.id, name: 'John Doe', age: 30 }]);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([{ id: user.id, name: 'John Doe', age: 27 }]);
    });

    it('Query::delete', async () => {
      const user = await models.User.create({ name: 'John Doe', age: 27 });

      const tx = await models.connection!.getTransaction();

      try {
        await models.User.query({ transaction: tx }).delete({ age: 27 });
        expect(await models.User.where().transaction(tx)).toEqual([]);
        await tx.rollback();
      } finally {
        try {
          await tx.rollback();
        } catch {
          /**/
        }
      }

      expect(await models.User.where()).toEqual([{ id: user.id, name: 'John Doe', age: 27 }]);
    });
  });
}
