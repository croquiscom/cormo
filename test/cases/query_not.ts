// tslint:disable:variable-name

import { expect } from 'chai';
import * as cormo from '../..';

import { UserRef, UserRefVO } from './query';

function _compareUser(user: UserRef, expected: UserRefVO) {
  if (expected.age != null) {
    expect(user).to.have.keys('id', 'name', 'age');
    expect(user.age).to.equal(expected.age);
  } else {
    expect(user).to.have.keys('id', 'name', 'age');
  }
  expect(user.name).to.equal(expected.name);
}

async function _createUsers(User: typeof UserRef, data?: UserRefVO[]) {
  if (!data) {
    data = [
      { name: 'John Doe', age: 27 },
      { name: 'Bill Smith', age: 45 },
      { name: 'Alice Jackson', age: 27 },
      { name: 'Gina Baker' },
      { name: 'Daniel Smith', age: 8 },
    ];
  }
  data.sort(() => 0.5 - Math.random()); // random sort
  return await User.createBulk(data);
}

export default function(models: {
  User: typeof UserRef,
  connection: cormo.Connection | null,
}) {
  it('simple not', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: { $not: 27 } });
    expect(users).to.have.length(3);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[2], { name: 'Gina Baker' });
  });

  it('where not chain', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: { $not: 27 } })
      .where({ name: { $not: 'Daniel Smith' } });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Gina Baker' });
  });

  it('not for id', async () => {
    const target = (await _createUsers(models.User))[0];
    const users = await models.User.where({ id: { $not: target.id } });
    expect(users).to.have.length(4);
  });

  it('not for comparison', async () => {
    await _createUsers(models.User);
    let users = await models.User.where({ age: { $gt: 30 } });
    expect(users).to.have.length(1);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    // '> 30' != 'not < 30' because of null value
    users = await models.User.where({ age: { $not: { $lt: 30 } } });
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users).to.have.length(2);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Gina Baker' });
  });

  it('not contains', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ name: { $not: { $contains: 'smi' } } });
    expect(users).to.have.length(3);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'Gina Baker' });
    _compareUser(users[2], { name: 'John Doe', age: 27 });
  });

  it('not contains multiple', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ name: { $not: { $contains: ['baker', 'doe'] } } });
    expect(users).to.have.length(3);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'Bill Smith', age: 45 });
    _compareUser(users[2], { name: 'Daniel Smith', age: 8 });
  });

  it('not startswith', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ name: { $not: { $startswith: 'd' } } });
    expect(users).to.have.length(4);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'Bill Smith', age: 45 });
    _compareUser(users[2], { name: 'Gina Baker' });
    _compareUser(users[3], { name: 'John Doe', age: 27 });
  });

  it('not endswith', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ name: { $not: { $endswith: 'h' } } });
    expect(users).to.have.length(3);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'Gina Baker' });
    _compareUser(users[2], { name: 'John Doe', age: 27 });
  });

  it('not $in', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: { $not: { $in: [27, 45, 57] } } });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[1], { name: 'Gina Baker' });
  });

  it('not $in for id', async () => {
    const sources = await _createUsers(models.User);
    sources.sort((a, b) => a.name! < b.name! ? -1 : 1);
    const users = await models.User.where({ id: { $not: { $in: [sources[2].id, sources[0].id] } } });
    expect(users).to.have.length(3);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Gina Baker' });
    _compareUser(users[2], { name: 'John Doe', age: 27 });
  });

  it('not for implicit $in', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: { $not: [27, 45, 57] } });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[1], { name: 'Gina Baker' });
  });
}
