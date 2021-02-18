import { expect } from 'chai';
import * as cormo from '../..';

import { UserRef, UserRefVO } from './query';

function _compareUserUnique(user: UserRef, expected: UserRefVO) {
  expect(user).to.have.keys('id', 'name', 'age', 'count');
  expect(user.name).to.equal(expected.name);
  expect(user.age).to.equal(expected.age);
  expect(user.count).to.equal(expected.count);
}

async function _createUserUniques(UserUnique: typeof UserRef, data?: UserRefVO[]) {
  if (!data) {
    data = [
      { name: 'Alice Jackson', age: 27 },
      { name: 'Bill Smith', age: 45 },
    ];
  }
  return await UserUnique.createBulk(data);
}

export default function(models: {
  UserUnique: typeof UserRef;
  connection: cormo.Connection | null;
}) {
  it('insert new', async () => {
    await _createUserUniques(models.UserUnique);
    await models.UserUnique.where({ name: 'Elsa Wood' }).upsert({ age: 10 });
    const users = await models.UserUnique.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users).to.have.length(3);
    _compareUserUnique(users[0], { name: 'Alice Jackson', age: 27, count: 5 });
    _compareUserUnique(users[1], { name: 'Bill Smith', age: 45, count: 5 });
    _compareUserUnique(users[2], { name: 'Elsa Wood', age: 10, count: 5 });
  });

  it('update exist', async () => {
    await _createUserUniques(models.UserUnique);
    await models.UserUnique.where({ name: 'Bill Smith' }).upsert({ age: 10 });
    const users = await models.UserUnique.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users).to.have.length(2);
    _compareUserUnique(users[0], { name: 'Alice Jackson', age: 27, count: 5 });
    _compareUserUnique(users[1], { name: 'Bill Smith', age: 10, count: 5 });
  });

  it('default value ignored on update', async () => {
    await _createUserUniques(models.UserUnique);
    await models.UserUnique.where({ name: 'Bill Smith' }).update({ age: 10, count: 8 });
    await models.UserUnique.where({ name: 'Bill Smith' }).upsert({ age: 10 });
    const users = await models.UserUnique.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users).to.have.length(2);
    _compareUserUnique(users[0], { name: 'Alice Jackson', age: 27, count: 5 });
    _compareUserUnique(users[1], { name: 'Bill Smith', age: 10, count: 8 });
  });

  it('$inc for new', async () => {
    await _createUserUniques(models.UserUnique);
    await models.UserUnique.where({ name: 'Elsa Wood' }).upsert({ age: { $inc: 4 } });
    const users = await models.UserUnique.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users).to.have.length(3);
    _compareUserUnique(users[0], { name: 'Alice Jackson', age: 27, count: 5 });
    _compareUserUnique(users[1], { name: 'Bill Smith', age: 45, count: 5 });
    _compareUserUnique(users[2], { name: 'Elsa Wood', age: 4, count: 5 });
  });

  it('$inc for exist', async () => {
    await _createUserUniques(models.UserUnique);
    await models.UserUnique.where({ name: 'Bill Smith' }).upsert({ age: { $inc: 4 } });
    const users = await models.UserUnique.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users).to.have.length(2);
    _compareUserUnique(users[0], { name: 'Alice Jackson', age: 27, count: 5 });
    _compareUserUnique(users[1], { name: 'Bill Smith', age: 49, count: 5 });
  });

  it('set field only on update', async () => {
    await models.UserUnique.where({ name: 'Elsa Wood' }).upsert({ age: 10, count: { $inc: 1 } }, { ignore_on_update: ['age'] });
    const users1 = await models.UserUnique.where();
    expect(users1).to.have.length(1);
    _compareUserUnique(users1[0], { name: 'Elsa Wood', age: 10, count: 1 });

    await models.UserUnique.where({ name: 'Elsa Wood' }).upsert({ age: 30, count: { $inc: 1 } }, { ignore_on_update: ['age'] });
    const users2 = await models.UserUnique.where();
    expect(users2).to.have.length(1);
    _compareUserUnique(users2[0], { name: 'Elsa Wood', age: 10, count: 2 });
  });

  it('set field only on update with $inc', async () => {
    await models.UserUnique.where({ name: 'Elsa Wood' }).upsert({ age: 10, count: { $inc: 1 } }, { ignore_on_update: ['count'] });
    const users1 = await models.UserUnique.where();
    expect(users1).to.have.length(1);
    _compareUserUnique(users1[0], { name: 'Elsa Wood', age: 10, count: 1 });

    await models.UserUnique.where({ name: 'Elsa Wood' }).upsert({ age: 30, count: { $inc: 1 } }, { ignore_on_update: ['count'] });
    const users2 = await models.UserUnique.where();
    expect(users2).to.have.length(1);
    _compareUserUnique(users2[0], { name: 'Elsa Wood', age: 30, count: 1 });
  });

  it('upsert with no update field', async () => {
    await models.UserUnique.where({ name: 'Elsa Wood' }).upsert({ age: 10 }, { ignore_on_update: ['age'] });
    const users1 = await models.UserUnique.where();
    expect(users1).to.have.length(1);
    _compareUserUnique(users1[0], { name: 'Elsa Wood', age: 10, count: 5 });

    await models.UserUnique.where({ name: 'Elsa Wood' }).upsert({ age: 30 }, { ignore_on_update: ['age'] });
    const users2 = await models.UserUnique.where();
    expect(users2).to.have.length(1);
    _compareUserUnique(users2[0], { name: 'Elsa Wood', age: 10, count: 5 });
  });
}
