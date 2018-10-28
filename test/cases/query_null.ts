// tslint:disable:variable-name

import { expect } from 'chai';
import * as cormo from '../..';

import { UserRef, UserRefVO } from './query';

function _compareUser(user: UserRef, expected: UserRefVO) {
  expect(user).to.have.keys('id', 'name', 'age');
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
  User: typeof UserRef,
  connection: cormo.Connection | null,
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
}
