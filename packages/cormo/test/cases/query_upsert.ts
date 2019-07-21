// tslint:disable:variable-name

import { expect } from 'chai';
import * as cormo from '../..';

import { UserRef, UserRefVO } from './query';

function _compareUserUnique(user: UserRef, expected: UserRefVO) {
  expect(user).to.have.keys('id', 'name', 'age');
  expect(user.name).to.equal(expected.name);
  expect(user.age).to.equal(expected.age);
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
  UserUnique: typeof UserRef,
  connection: cormo.Connection | null,
}) {
  it('insert new', async () => {
    await _createUserUniques(models.UserUnique);
    await models.UserUnique.where({ name: 'Elsa Wood' }).upsert({ age: 10 });
    const users = await models.UserUnique.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users).to.have.length(3);
    _compareUserUnique(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUserUnique(users[1], { name: 'Bill Smith', age: 45 });
    _compareUserUnique(users[2], { name: 'Elsa Wood', age: 10 });
  });

  it('update exist', async () => {
    await _createUserUniques(models.UserUnique);
    await models.UserUnique.where({ name: 'Bill Smith' }).upsert({ age: 10 });
    const users = await models.UserUnique.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users).to.have.length(2);
    _compareUserUnique(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUserUnique(users[1], { name: 'Bill Smith', age: 10 });
  });

  it('$inc for new', async () => {
    await _createUserUniques(models.UserUnique);
    await models.UserUnique.where({ name: 'Elsa Wood' }).upsert({ age: { $inc: 4 } });
    const users = await models.UserUnique.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users).to.have.length(3);
    _compareUserUnique(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUserUnique(users[1], { name: 'Bill Smith', age: 45 });
    _compareUserUnique(users[2], { name: 'Elsa Wood', age: 4 });
  });

  it('$inc for exist', async () => {
    await _createUserUniques(models.UserUnique);
    await models.UserUnique.where({ name: 'Bill Smith' }).upsert({ age: { $inc: 4 } });
    const users = await models.UserUnique.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users).to.have.length(2);
    _compareUserUnique(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUserUnique(users[1], { name: 'Bill Smith', age: 49 });
  });
}
