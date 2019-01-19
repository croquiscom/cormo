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
}
