// tslint:disable:no-unused-expression variable-name

import { expect } from 'chai';
import * as cormo from '../..';

export class UserRef extends cormo.BaseModel {
  public name?: string | null;

  public age?: number | null;
}

export type UserRefVO = cormo.ModelValueObject<UserRef>;

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
  User: typeof UserRef,
  connection: cormo.Connection | null,
}) {
  it('simple where', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: 27 });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
  });

  it('where chain', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: 27 }).where({ name: 'Alice Jackson' });
    expect(users).to.have.length(1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
  });

  it('id', async () => {
    const target = (await _createUsers(models.User))[0];
    const users = await models.User.where({ id: target.id });
    expect(users).to.have.length(1);
    _compareUser(users[0], target);
  });

  it('implicit and', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: 27, name: 'Alice Jackson' });
    expect(users).to.have.length(1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
  });

  it('$or', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ $or: [{ age: 32 }, { name: 'John Doe' }] });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Gina Baker', age: 32 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
  });

  it('comparison', async () => {
    await _createUsers(models.User);
    const users = await models.User.where([{ age: { $gt: 30 } }, { age: { $lte: 45 } }]);
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Gina Baker', age: 32 });
  });

  it('contains', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ name: { $contains: 'smi' } });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Daniel Smith', age: 8 });
  });

  it('contains multiple', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ name: { $contains: ['baker', 'doe'] } });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Gina Baker', age: 32 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
  });

  it('startswith', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ name: { $startswith: 'd' } });
    expect(users).to.have.length(1);
    _compareUser(users[0], { name: 'Daniel Smith', age: 8 });
  });

  it('endswith', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ name: { $endswith: 'h' } });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Daniel Smith', age: 8 });
  });

  it('$in', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: { $in: [32, 45, 57] } });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Gina Baker', age: 32 });
  });

  it('$in for id', async () => {
    const sources = await _createUsers(models.User);
    sources.sort((a, b) => a.name! < b.name! ? -1 : 1);
    const users = await models.User.where({ id: { $in: [sources[2].id, sources[0].id] } });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'Daniel Smith', age: 8 });
  });

  it('implicit $in', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: [32, 45, 57] });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Gina Baker', age: 32 });
  });

  it('$in with an empty array', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: { $in: [] } });
    expect(users).to.have.length(0);
  });

  it('basic regular expression', async () => {
    await _createUsers(models.User);
    try {
      const users = await models.User.where({ name: /smi/ });
      expect(users).to.have.length(2);
      users.sort((a, b) => a.name! < b.name! ? -1 : 1);
      _compareUser(users[0], { name: 'Bill Smith', age: 45 });
      _compareUser(users[1], { name: 'Daniel Smith', age: 8 });
    } catch (error) {
      if (error.message === 'regular expression is not supported') {
        return;
      }
      throw error;
    }
  });

  it('complex regular expression', async () => {
    await _createUsers(models.User);
    try {
      const users = await models.User.where({ name: /l{2}|n$/ });
      expect(users).to.have.length(2);
      users.sort((a, b) => a.name! < b.name! ? -1 : 1);
      _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
      _compareUser(users[1], { name: 'Bill Smith', age: 45 });
    } catch (error) {
      if (error.message === 'regular expression is not supported') {
        return;
      }
      throw error;
    }
  });

  it('count none', async () => {
    const count = await models.User.count();
    expect(count).to.equal(0);
  });

  it('count all', async () => {
    await _createUsers(models.User);
    const count = await models.User.count();
    expect(count).to.equal(5);
  });

  it('count condition', async () => {
    await _createUsers(models.User);
    const count = await models.User.count({ age: 27 });
    expect(count).to.equal(2);
  });

  it('delete all', async () => {
    await _createUsers(models.User);
    const count = await models.User.delete();
    expect(count).to.equal(5);
    const users = await models.User.where();
    expect(users).to.have.length(0);
  });

  it('delete condition', async () => {
    await _createUsers(models.User);
    const count = await models.User.delete({ age: 27 });
    expect(count).to.equal(2);
    const users = await models.User.where();
    expect(users).to.have.length(3);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[2], { name: 'Gina Baker', age: 32 });
  });

  it('limit', async () => {
    await _createUsers(models.User);
    let users = await models.User.query();
    expect(users).to.have.length(5);
    users = await models.User.query().limit(3);
    expect(users).to.have.length(3);
    users = await models.User.where({ age: { $lt: 40 } });
    expect(users).to.have.length(4);
    users = await models.User.where({ age: { $lt: 40 } }).limit(1);
    expect(users).to.have.length(1);
    expect(users[0]).to.have.property('name');
    if (users[0].name === 'Alice Jackson') {
      _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    } else if (users[0].name === 'John Doe') {
      _compareUser(users[0], { name: 'John Doe', age: 27 });
    } else if (users[0].name === 'Gina Baker') {
      _compareUser(users[0], { name: 'Gina Baker', age: 32 });
    } else {
      _compareUser(users[0], { name: 'Daniel Smith', age: 8 });
    }
  });

  it('one', async () => {
    await _createUsers(models.User);
    let user = await models.User.where({ age: { $lt: 40 } }).one();
    expect(user).to.have.property('name');
    if (user.name === 'Alice Jackson') {
      _compareUser(user, { name: 'Alice Jackson', age: 27 });
    } else if (user.name === 'John Doe') {
      _compareUser(user, { name: 'John Doe', age: 27 });
    } else if (user.name === 'Gina Baker') {
      _compareUser(user, { name: 'Gina Baker', age: 32 });
    } else {
      _compareUser(user, { name: 'Daniel Smith', age: 8 });
    }
    user = await models.User.where({ age: { $lt: 5 } }).one();
    expect(user).to.not.exist;
  });

  it('skip', async () => {
    await _createUsers(models.User);
    let users = await models.User.query().order('age').skip(3);
    expect(users).to.have.length(2);
    _compareUser(users[0], { name: 'Gina Baker', age: 32 });
    _compareUser(users[1], { name: 'Bill Smith', age: 45 });
    users = await models.User.query().order('age').skip(1).limit(2);
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
  });

  it('select', async () => {
    await _createUsers(models.User);
    const users1 = await models.User.select();
    expect(users1[0]).to.have.keys('id', 'name', 'age');
    const users2 = await models.User.select('name age address');
    expect(users2[0]).to.have.keys('id', 'name', 'age');
    const users3 = await models.User.select('name');
    expect(users3[0]).to.have.keys('id', 'name');
    const users4 = await models.User.select('');
    expect(users4[0]).to.have.keys('id');
  });

  it('select with string array', async () => {
    await _createUsers(models.User);
    const users1 = await models.User.select();
    expect(users1[0]).to.have.keys('id', 'name', 'age');
    const users2 = await models.User.select(['id', 'name', 'age', 'address'] as any);
    expect(users2[0]).to.have.keys('id', 'name', 'age');
    const users3 = await models.User.select(['id', 'name']);
    expect(users3[0]).to.have.keys('id', 'name');
    const users4 = await models.User.select([]);
    expect(users4[0]).to.have.keys('id', 'name', 'age');
    const users5 = await models.User.select([''] as any);
    expect(users5[0]).to.have.keys('id', 'name', 'age');
  });

  it('select without id', async () => {
    const sources = await _createUsers(models.User);

    const user = await models.User.find(sources[0].id).select(['name', 'age']);
    expect(user).to.have.keys('id', 'name', 'age');
    expect((user as any).id).to.be.null;
    expect(user.name).to.eql(sources[0].name);
    expect(user.age).to.eql(sources[0].age);

    // save affects no records
    user.age = 50;
    await (user as any).save();

    const users = await models.User.where();
    expect(users).to.have.length(5);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'Bill Smith', age: 45 });
    _compareUser(users[2], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[3], { name: 'Gina Baker', age: 32 });
    _compareUser(users[4], { name: 'John Doe', age: 27 });
  });

  it('order (string)', async () => {
    await _createUsers(models.User);
    let users = await models.User.order('name');
    expect(users).to.have.length(5);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'Bill Smith', age: 45 });
    _compareUser(users[2], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[3], { name: 'Gina Baker', age: 32 });
    _compareUser(users[4], { name: 'John Doe', age: 27 });
    users = await models.User.order('-name');
    expect(users).to.have.length(5);
    _compareUser(users[0], { name: 'John Doe', age: 27 });
    _compareUser(users[1], { name: 'Gina Baker', age: 32 });
    _compareUser(users[2], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[3], { name: 'Bill Smith', age: 45 });
    _compareUser(users[4], { name: 'Alice Jackson', age: 27 });
  });

  it('order (number)', async () => {
    await _createUsers(models.User);
    let users = await models.User.order('age');
    expect(users).to.have.length(5);
    _compareUser(users[0], { name: 'Daniel Smith', age: 8 });
    if (users[1].name === 'Alice Jackson') {
      _compareUser(users[1], { name: 'Alice Jackson', age: 27 });
      _compareUser(users[2], { name: 'John Doe', age: 27 });
    } else {
      _compareUser(users[1], { name: 'John Doe', age: 27 });
      _compareUser(users[2], { name: 'Alice Jackson', age: 27 });
    }
    _compareUser(users[3], { name: 'Gina Baker', age: 32 });
    _compareUser(users[4], { name: 'Bill Smith', age: 45 });
    users = await models.User.order('-age');
    expect(users).to.have.length(5);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Gina Baker', age: 32 });
    if (users[2].name === 'Alice Jackson') {
      _compareUser(users[2], { name: 'Alice Jackson', age: 27 });
      _compareUser(users[3], { name: 'John Doe', age: 27 });
    } else {
      _compareUser(users[2], { name: 'John Doe', age: 27 });
      _compareUser(users[3], { name: 'Alice Jackson', age: 27 });
    }
    _compareUser(users[4], { name: 'Daniel Smith', age: 8 });
  });

  it('order (complex)', async () => {
    await _createUsers(models.User);
    let users = await models.User.order('age name');
    expect(users).to.have.length(5);
    _compareUser(users[0], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[1], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[2], { name: 'John Doe', age: 27 });
    _compareUser(users[3], { name: 'Gina Baker', age: 32 });
    _compareUser(users[4], { name: 'Bill Smith', age: 45 });
    users = (await models.User.order('age -name'));
    expect(users).to.have.length(5);
    _compareUser(users[0], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
    _compareUser(users[2], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[3], { name: 'Gina Baker', age: 32 });
    _compareUser(users[4], { name: 'Bill Smith', age: 45 });
  });

  it('order (id)', async () => {
    const sources = await _createUsers(models.User);
    sources.sort((a, b) => a.id < b.id ? -1 : 1);
    let users = await models.User.order('id');
    expect(users).to.have.length(5);
    for (let i = 0; i <= 4; i++) {
      _compareUser(users[i], sources[i]);
    }
    users = await models.User.order('-id');
    expect(users).to.have.length(5);
    for (let i = 0; i <= 4; i++) {
      _compareUser(users[i], sources[4 - i]);
    }
  });

  it('lean option for a single record', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const record = await models.User.find(user.id).lean();
    expect(record).to.eql({ id: user.id, name: user.name, age: user.age });
  });

  it('lean option for multiple records', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: 27 }).lean();
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users[0]).to.not.be.an.instanceof(models.User);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    expect(users[1]).to.not.be.an.instanceof(models.User);
    _compareUser(users[1], { name: 'John Doe', age: 27 });
  });

  it('lean option of null value with select', async () => {
    await models.User.createBulk([{ name: 'Gina Baker' }]);
    const users = await models.User.select('name age').lean();
    expect(users).to.have.length(1);
    expect(users[0]).to.have.keys('id', 'name', 'age');
    expect(users[0].age).to.be.null;
  });

  it('lean option of null value without select', async () => {
    await models.User.createBulk([{ name: 'Gina Baker' }]);
    const users = await models.User.query().lean();
    expect(users).to.have.length(1);
    expect(users[0]).to.have.keys('id', 'name', 'age');
    expect(users[0].age).to.be.null;
  });

  it('lean option without id', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const record = await models.User.find(user.id).select(['name', 'age']).lean();
    expect(record).to.eql({ name: user.name, age: user.age });
  });

  it('id field of lean result can be modified', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const record = await models.User.find(user.id).lean();
    (record as any).id = 'new id';
    expect(record.id).to.be.equal('new id');
  });

  it('cache', async () => {
    await _createUsers(models.User);
    let users = await models.User.where({ age: 27 }).cache({ key: 'user', ttl: 30, refresh: true });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
    // different conditions, will return cached result
    users = await models.User.where({ age: 8 }).cache({ key: 'user', ttl: 30 });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
    // try ignoring cache
    users = await models.User.where({ age: 8 }).cache({ key: 'user', ttl: 30, refresh: true });
    expect(users).to.have.length(1);
    _compareUser(users[0], { name: 'Daniel Smith', age: 8 });
    // different conditions, will return cached result
    users = await models.User.where({ age: 32 }).cache({ key: 'user', ttl: 30 });
    expect(users).to.have.length(1);
    _compareUser(users[0], { name: 'Daniel Smith', age: 8 });
    // try after removing cache
    await models.User.removeCache('user');
    users = await models.User.where({ age: 32 }).cache({ key: 'user', ttl: 30 });
    expect(users).to.have.length(1);
    _compareUser(users[0], { name: 'Gina Baker', age: 32 });
  });

  it('comparison on id', async () => {
    const users = await _createUsers(models.User);
    users.sort((a, b) => a.id < b.id ? -1 : 1);
    const records = await models.User.where({ id: { $lt: users[2].id } });
    expect(records).to.have.length(2);
    _compareUser(users[0], records[0]);
    _compareUser(users[1], records[1]);
    const count = await models.User.count({ id: { $lt: users[2].id } });
    expect(count).to.equal(2);
  });

  it('find undefined & count', async () => {
    await _createUsers(models.User);
    const count = await models.User.find(undefined as any).count();
    expect(count).to.equal(0);
  });

  it('find undefined & delete', async () => {
    await _createUsers(models.User);
    const count = await models.User.find(undefined as any).delete();
    expect(count).to.equal(0);
    const users = await models.User.where();
    expect(users).to.have.length(5);
  });

  it('turn on lean option in a Model', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    models.User.lean_query = true;
    const record = await models.User.find(user.id);
    models.User.lean_query = false;
    expect(record).to.exist;
    expect(record).to.not.be.an.instanceof(models.User);
    expect(record).to.have.property('id', user.id);
    expect(record).to.have.property('name', user.name);
    expect(record).to.have.property('age', user.age);
  });

  it('turn off lean option for a query', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    models.User.lean_query = true;
    const record = await models.User.find(user.id).lean(false);
    models.User.lean_query = false;
    expect(record).to.exist;
    expect(record).to.be.an.instanceof(models.User);
    expect(record).to.have.property('id', user.id);
    expect(record).to.have.property('name', user.name);
    expect(record).to.have.property('age', user.age);
  });

  it('if', async () => {
    await _createUsers(models.User);
    const query = async (limit: boolean) => await models.User.query().if(limit).limit(1).endif().where({ age: 27 });
    let users = await query(false);
    expect(users).to.have.length(2);
    expect(users[0]).to.have.property('age', 27);
    expect(users[1]).to.have.property('age', 27);
    users = await query(true);
    expect(users).to.have.length(1);
    expect(users[0]).to.have.property('age', 27);
  });

  it('nested if', async () => {
    await _createUsers(models.User);
    const query = async (limit: boolean) => await models.User.query()
      .if(limit).if(false).where({ name: 'Unknown' }).endif().limit(1).endif()
      .where({ age: 27 });
    let users = await query(false);
    expect(users).to.have.length(2);
    expect(users[0]).to.have.property('age', 27);
    expect(users[1]).to.have.property('age', 27);
    users = await query(true);
    expect(users).to.have.length(1);
    expect(users[0]).to.have.property('age', 27);
  });

  it('invalid number', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: '27a' });
    expect(users).to.have.length(0);
  });

  it('invalid number(find)', async () => {
    const users = await _createUsers(models.User);
    if (typeof users[0].id === 'string') {
      return;
    }
    try {
      await models.User.find(users[0].id + 'a');
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error).to.exist;
      expect(error.message).to.equal('not found');
    }
  });

  it('invalid number(where id:)', async () => {
    let users = await _createUsers(models.User);
    if (typeof users[0].id === 'string') {
      return;
    }
    users = await models.User.where({ id: users[0].id + 'a' });
    expect(users).to.have.length(0);
  });

  it('explain for simple(findById)', async () => {
    const users = await _createUsers(models.User);
    const result = await models.User.find(users[0].id).lean().explain();
    expect(result).to.not.eql({ id: users[0].id, name: users[0].name, age: users[0].age });
  });

  it('explain for complex(find)', async () => {
    await _createUsers(models.User);
    const result = await models.User.where({ age: 8 }).lean().explain();
    const id = result && result[0] && result.id;
    expect(result).to.not.eql([{ id, name: 'Daniel Smith', age: 8 }]);
  });
}
