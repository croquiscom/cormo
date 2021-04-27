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

export default function (models: { User: typeof UserRef; connection: cormo.Connection | null }) {
  it('lean option for a single record', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const record = await models.User.find(user.id).lean();
    expect(record).to.eql({ id: user.id, name: user.name, age: user.age });
  });

  it('lean option for multiple records', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: 27 }).lean();
    expect(users).to.have.length(2);
    users.sort((a, b) => (a.name! < b.name! ? -1 : 1));
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

  it('cache', async () => {
    await _createUsers(models.User);
    let users = await models.User.where({ age: 27 }).cache({ key: 'user', ttl: 30, refresh: true });
    expect(users).to.have.length(2);
    users.sort((a, b) => (a.name! < b.name! ? -1 : 1));
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
    // different conditions, will return cached result
    users = await models.User.where({ age: 8 }).cache({ key: 'user', ttl: 30 });
    expect(users).to.have.length(2);
    users.sort((a, b) => (a.name! < b.name! ? -1 : 1));
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
    users.sort((a, b) => (a.id < b.id ? -1 : 1));
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
    const query = async (limit: boolean) =>
      await models.User.query()
        .if(limit)
        .if(false)
        .where({ name: 'Unknown' })
        .endif()
        .limit(1)
        .endif()
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

  it('cannot reuse query object', async () => {
    await _createUsers(models.User);
    const query = models.User.where({ age: 8 });
    await query.count();
    try {
      await query.select(['name']);
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.equal('Query object is already used');
    }
  });

  it('clone', async () => {
    await _createUsers(models.User);
    const query = models.User.where({ age: 27 }).select(['name']);
    const cloned = query.clone();
    expect(await query.where({ name: 'John Doe' }).select(['name', 'age'])).to.eql([
      { id: null, name: 'John Doe', age: 27 },
    ]);
    expect(await cloned.order('name')).to.eql([
      { id: null, name: 'Alice Jackson' },
      { id: null, name: 'John Doe' },
    ]);
  });
}
