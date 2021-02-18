import { expect } from 'chai';
import * as cormo from '../..';

import { UserRef, UserRefVO } from './query';

function _getInvalidID(id: number | string) {
  if (typeof id === 'number') {
    // MySQL
    return -1;
  } else if (typeof id === 'string') {
    // MongoDB
    return id.replace(/./, '9');
  } else {
    throw new Error('no support');
  }
}

function _compareUser(user: UserRef, expected: UserRefVO) {
  expect(user).to.have.keys('id', 'name', 'age', 'count');
  if (expected.name != null) {
    expect(user.name).to.equal(expected.name);
  }
  if (expected.age != null) {
    return expect(user.age).to.equal(expected.age);
  }
}

async function _createUsers(User: typeof UserRef, data?: UserRefVO[]) {
  if (!data) {
    data = [
      { name: 'John Doe', age: 27 },
      { name: 'Bill Smith', age: 45 },
      { name: 'Alice Jackson' },
      {},
      { age: 8 },
    ];
  }
  data.sort(() => 0.5 - Math.random()); // random sort
  return await User.createBulk(data);
}

export default function(models: {
  User: typeof UserRef;
  connection: cormo.Connection | null;
}) {
  it('equal null 1', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: null });
    expect(users).to.have.length(2);
    if (users[0].name != null) {
      [users[0], users[1]] = [users[1], users[0]];
    }
    _compareUser(users[0], {});
    _compareUser(users[1], { name: 'Alice Jackson' });
  });

  it('equal null 2', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ name: null });
    expect(users).to.have.length(2);
    if (users[0].age != null) {
      [users[0], users[1]] = [users[1], users[0]];
    }
    _compareUser(users[0], {});
    _compareUser(users[1], { age: 8 });
  });

  it('not equal null 1', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: { $not: null } });
    expect(users).to.have.length(3);
    users.sort((a, b) => a.age! < b.age! ? -1 : 1);
    _compareUser(users[0], { age: 8 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
    _compareUser(users[2], { name: 'Bill Smith', age: 45 });
  });

  it('not equal null 2', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ name: { $not: null } });
    expect(users).to.have.length(3);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson' });
    _compareUser(users[1], { name: 'Bill Smith', age: 45 });
    _compareUser(users[2], { name: 'John Doe', age: 27 });
  });

  it('null in $or', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ $or: [{ name: { $not: null } }, { age: null }] });
    expect(users).to.have.length(4);
    users.sort((a, b) => {
      if (!a.name) {
        return -1;
      }
      if (!b.name) {
        return 1;
      }
      if (a.name < b.name) {
        return -1;
      } else {
        return 1;
      }
    });
    _compareUser(users[0], {});
    _compareUser(users[1], { name: 'Alice Jackson' });
    _compareUser(users[2], { name: 'Bill Smith', age: 45 });
    _compareUser(users[3], { name: 'John Doe', age: 27 });
  });

  it('selectSingle', async () => {
    await _createUsers(models.User);
    const user_names = await models.User.query().selectSingle('name');
    expect(user_names.sort()).to.eql(['Alice Jackson', 'Bill Smith', 'John Doe', null, null]);
    const user_ages = await models.User.query().selectSingle('age');
    expect(user_ages.sort()).to.eql([27, 45, 8, null, null]);
  });

  it('selectSingle for single record', async () => {
    const user = await models.User.create({ name: 'John Doe' });

    expect(await models.User.find(user.id).selectSingle('id')).to.eql(user.id);
    expect(await models.User.find(user.id).selectSingle('name')).to.eql(user.name);
    expect(await models.User.find(user.id).selectSingle('age')).to.eql(user.age);

    expect(await models.User.where({ id: user.id }).one().selectSingle('id')).to.eql(user.id);
    expect(await models.User.where({ id: user.id }).one().selectSingle('name')).to.eql(user.name);
    expect(await models.User.where({ id: user.id }).one().selectSingle('age')).to.eql(user.age);

    expect(await models.User.where({ id: _getInvalidID(user.id) }).one().selectSingle('id')).to.eql(null);
    expect(await models.User.where({ id: _getInvalidID(user.id) }).one().selectSingle('name')).to.eql(null);
    expect(await models.User.where({ id: _getInvalidID(user.id) }).one().selectSingle('age')).to.eql(null);
  });
}
