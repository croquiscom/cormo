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
}
