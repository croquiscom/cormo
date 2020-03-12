import { expect } from 'chai';
import * as cormo from '../..';

import { UserRef, UserRefVO } from './query';

function _compareUser(user: UserRef, expected: UserRefVO) {
  expect(user).to.have.keys('id', 'name', 'age');
  expect(user.name).to.equal(expected.name);
  expect(user.age).to.equal(expected.age);
}

async function _createUsers(User: typeof UserRef, data?: UserRefVO[]) {
  if (!data) {
    data = [
      { name: 'John Doe', age: 27 },
      { name: 'Bill Smith', age: 45 },
      { name: 'Alice Jackson', age: 27 },
      { name: 'Gina Baker', age: 32 },
      { name: 'Daniel Smith', age: 8 },
    ];
  }
  data.sort(() => 0.5 - Math.random()); // random sort
  return await User.createBulk(data);
}

export default function(models: {
  User: typeof UserRef;
  connection: cormo.Connection | null;
}) {
  it('update all', async () => {
    await _createUsers(models.User);
    const count = await models.User.update({ age: 10 });
    expect(count).to.equal(5);
    const users = await models.User.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 10 });
    _compareUser(users[1], { name: 'Bill Smith', age: 10 });
    _compareUser(users[2], { name: 'Daniel Smith', age: 10 });
    _compareUser(users[3], { name: 'Gina Baker', age: 10 });
    _compareUser(users[4], { name: 'John Doe', age: 10 });
  });

  it('update condition', async () => {
    await _createUsers(models.User);
    const count = await models.User.update({ age: 10 }, { age: 27 });
    expect(count).to.equal(2);
    const users = await models.User.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 10 });
    _compareUser(users[1], { name: 'Bill Smith', age: 45 });
    _compareUser(users[2], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[3], { name: 'Gina Baker', age: 32 });
    _compareUser(users[4], { name: 'John Doe', age: 10 });
  });

  it('find & update', async () => {
    const sources = await _createUsers(models.User);
    sources.sort((a, b) => a.name! < b.name! ? -1 : 1);
    const count = await models.User.find(sources[2].id).update({ age: 10 });
    expect(count).to.equal(1);
    const users = await models.User.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'Bill Smith', age: 45 });
    _compareUser(users[2], { name: 'Daniel Smith', age: 10 });
    _compareUser(users[3], { name: 'Gina Baker', age: 32 });
    _compareUser(users[4], { name: 'John Doe', age: 27 });
  });

  it('find multiple & update', async () => {
    const sources = await _createUsers(models.User);
    sources.sort((a, b) => a.name! < b.name! ? -1 : 1);
    const count = await models.User.find([sources[2].id, sources[3].id]).update({ age: 10 });
    expect(count).to.equal(2);
    const users = await models.User.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'Bill Smith', age: 45 });
    _compareUser(users[2], { name: 'Daniel Smith', age: 10 });
    _compareUser(users[3], { name: 'Gina Baker', age: 10 });
    _compareUser(users[4], { name: 'John Doe', age: 27 });
  });

  it('find undefined & update', async () => {
    await _createUsers(models.User);
    const count = await models.User.find(undefined as any).update({ age: 10 });
    expect(count).to.equal(0);
    const users = await models.User.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'Bill Smith', age: 45 });
    _compareUser(users[2], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[3], { name: 'Gina Baker', age: 32 });
    _compareUser(users[4], { name: 'John Doe', age: 27 });
  });

  it('update to remove a field (set null)', async () => {
    const users = await _createUsers(models.User);
    const count = await models.User.find(users[2].id).update({ age: null });
    expect(count).to.equal(1);
    const user = await models.User.find(users[2].id);
    expect(user).to.have.keys('id', 'name', 'age');
  });

  it('$inc', async () => {
    const users = await _createUsers(models.User);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    const count = await models.User.find(users[2].id).update({ age: { $inc: 4 } });
    expect(count).to.equal(1);
    const user = await models.User.find(users[2].id);
    _compareUser(user!, { name: 'Daniel Smith', age: 12 });
  });

  it('$inc for non-integer column', async () => {
    const users = await _createUsers(models.User);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    try {
      await models.User.find(users[2].id).update({ name: { $inc: 4 } });
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error).to.exist;
      expect(error.message).to.equal("'name' is not a number type");
    }
  });
}
