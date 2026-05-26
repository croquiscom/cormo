import { expect, it } from 'vitest';
import * as cormo from '../../src/index.js';

export class UserRef extends cormo.BaseModel {
  public name?: string | null;

  public age?: number | null;
}

export type UserRefVO = cormo.ModelValueObject<UserRef>;

function _compareUser(user: UserRef, expected: UserRefVO) {
  expect(user).toHaveKeys('id', 'name', 'age');
  expect(user.name).toBe(expected.name);
  expect(user.age).toBe(expected.age);
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
    expect(record).toEqual({ id: user.id, name: user.name, age: user.age });
  });

  it('lean option for multiple records', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: 27 }).lean();
    expect(users).toHaveLength(2);
    users.sort((a, b) => (a.name! < b.name! ? -1 : 1));
    expect(users[0]).not.toBeInstanceOf(models.User);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    expect(users[1]).not.toBeInstanceOf(models.User);
    _compareUser(users[1], { name: 'John Doe', age: 27 });
  });

  it('lean option of null value with select', async () => {
    await models.User.createBulk([{ name: 'Gina Baker' }]);
    const users = await models.User.select('name age').lean();
    expect(users).toHaveLength(1);
    expect(users[0]).toHaveKeys('id', 'name', 'age');
    expect(users[0].age).toBeNull();
  });

  it('lean option of null value without select', async () => {
    await models.User.createBulk([{ name: 'Gina Baker' }]);
    const users = await models.User.query().lean();
    expect(users).toHaveLength(1);
    expect(users[0]).toHaveKeys('id', 'name', 'age');
    expect(users[0].age).toBeNull();
  });

  it('lean option without id', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const record = await models.User.find(user.id).select(['name', 'age']).lean();
    expect(record).toEqual({ name: user.name, age: user.age });
  });

  it('id field of lean result can be modified', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const record = await models.User.find(user.id).lean();
    (record as any).id = 'new id';
    expect(record.id).toBe('new id');
  });

  it('turn on lean option in a Model', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    models.User.lean_query = true;
    const record = await models.User.find(user.id);
    models.User.lean_query = false;
    expect(record).toExist();
    expect(record).not.toBeInstanceOf(models.User);
    expect(record).toHaveProperty('id', user.id);
    expect(record).toHaveProperty('name', user.name);
    expect(record).toHaveProperty('age', user.age);
  });

  it('turn off lean option for a query', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    models.User.lean_query = true;
    const record = await models.User.find(user.id).lean(false);
    models.User.lean_query = false;
    expect(record).toExist();
    expect(record).toBeInstanceOf(models.User);
    expect(record).toHaveProperty('id', user.id);
    expect(record).toHaveProperty('name', user.name);
    expect(record).toHaveProperty('age', user.age);
  });

  it('cache', async () => {
    await _createUsers(models.User);
    let users = await models.User.where({ age: 27 }).cache({ key: 'user', ttl: 30, refresh: true });
    expect(users).toHaveLength(2);
    users.sort((a, b) => (a.name! < b.name! ? -1 : 1));
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
    // different conditions, will return cached result
    users = await models.User.where({ age: 8 }).cache({ key: 'user', ttl: 30 });
    expect(users).toHaveLength(2);
    users.sort((a, b) => (a.name! < b.name! ? -1 : 1));
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
    // try ignoring cache
    users = await models.User.where({ age: 8 }).cache({ key: 'user', ttl: 30, refresh: true });
    expect(users).toHaveLength(1);
    _compareUser(users[0], { name: 'Daniel Smith', age: 8 });
    // different conditions, will return cached result
    users = await models.User.where({ age: 32 }).cache({ key: 'user', ttl: 30 });
    expect(users).toHaveLength(1);
    _compareUser(users[0], { name: 'Daniel Smith', age: 8 });
    // try after removing cache
    await models.User.removeCache('user');
    users = await models.User.where({ age: 32 }).cache({ key: 'user', ttl: 30 });
    expect(users).toHaveLength(1);
    _compareUser(users[0], { name: 'Gina Baker', age: 32 });
  });

  it('comparison on id', async () => {
    const users = await _createUsers(models.User);
    users.sort((a, b) => (a.id < b.id ? -1 : 1));
    const records = await models.User.where({ id: { $lt: users[2].id } });
    expect(records).toHaveLength(2);
    _compareUser(users[0], records[0]);
    _compareUser(users[1], records[1]);
    const count = await models.User.count({ id: { $lt: users[2].id } });
    expect(count).toBe(2);
  });

  it('find undefined & count', async () => {
    await _createUsers(models.User);
    const count = await models.User.find(undefined as any).count();
    expect(count).toBe(0);
  });

  it('find undefined & delete', async () => {
    await _createUsers(models.User);
    const count = await models.User.find(undefined as any).delete();
    expect(count).toBe(0);
    const users = await models.User.where();
    expect(users).toHaveLength(5);
  });

  it('if', async () => {
    await _createUsers(models.User);
    const query = async (limit: boolean) => await models.User.query().if(limit).limit(1).endif().where({ age: 27 });
    let users = await query(false);
    expect(users).toHaveLength(2);
    expect(users[0]).toHaveProperty('age', 27);
    expect(users[1]).toHaveProperty('age', 27);
    users = await query(true);
    expect(users).toHaveLength(1);
    expect(users[0]).toHaveProperty('age', 27);
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
    expect(users).toHaveLength(2);
    expect(users[0]).toHaveProperty('age', 27);
    expect(users[1]).toHaveProperty('age', 27);
    users = await query(true);
    expect(users).toHaveLength(1);
    expect(users[0]).toHaveProperty('age', 27);
  });

  it('invalid number', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: '27a' });
    expect(users).toHaveLength(0);
  });

  it('invalid number(find)', async () => {
    const users = await _createUsers(models.User);
    if (typeof users[0].id === 'string') {
      return;
    }
    try {
      await models.User.find(users[0].id + 'a');
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).toExist();
      expect(error.message).toBe('not found');
    }
  });

  it('invalid number(where id:)', async () => {
    let users = await _createUsers(models.User);
    if (typeof users[0].id === 'string') {
      return;
    }
    users = await models.User.where({ id: users[0].id + 'a' });
    expect(users).toHaveLength(0);
  });

  it('explain for simple(findById)', async () => {
    const users = await _createUsers(models.User);
    const result = await models.User.find(users[0].id).lean().explain();
    expect(result).not.toEqual({ id: users[0].id, name: users[0].name, age: users[0].age });
  });

  it('explain for complex(find)', async () => {
    await _createUsers(models.User);
    const result = await models.User.where({ age: 8 }).lean().explain();
    const id = result && result[0] && result.id;
    expect(result).not.toEqual([{ id, name: 'Daniel Smith', age: 8 }]);
  });

  it('cannot reuse query object', async () => {
    await _createUsers(models.User);
    const query = models.User.where({ age: 8 });
    await query.count();
    try {
      await query.select(['name']);
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Query object is already used');
    }
  });

  it('clone', async () => {
    await _createUsers(models.User);
    const query = models.User.where({ age: 27 }).select(['name']);
    const cloned = query.clone();
    expect(await query.where({ name: 'John Doe' }).select(['name', 'age'])).toEqual([
      { id: null, name: 'John Doe', age: 27 },
    ]);
    expect(await cloned.order('name')).toEqual([
      { id: null, name: 'Alice Jackson' },
      { id: null, name: 'John Doe' },
    ]);
  });

  it('distinct', async () => {
    try {
      await _createUsers(models.User);
      const records = await models.User.where({ age: { $gt: 10 } })
        .select(['age'])
        .order('age')
        .distinct();
      expect(records).toEqual([
        { id: null, age: 27 },
        { id: null, age: 32 },
        { id: null, age: 45 },
      ]);

      const count = await models.User.where({ age: { $gt: 10 } })
        .select(['age'])
        .order('age')
        .distinct()
        .count();
      expect(count).toEqual(3);
    } catch (error: any) {
      if (error.message === 'this adapter does not support distinct') {
        return;
      }
      throw error;
    }
  });

  it('return record id as string', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    models.User.query_record_id_as_string = true;
    const record = await models.User.find(user.id);
    const record_lean = await models.User.find(user.id).lean();
    models.User.query_record_id_as_string = false;
    expect(record).toExist();
    expect(record).toBeInstanceOf(models.User);
    expect(record).toHaveProperty('id', String(user.id));
    expect(record).toHaveProperty('name', user.name);
    expect(record).toHaveProperty('age', user.age);
    expect(record_lean).toExist();
    expect(record_lean).not.toBeInstanceOf(models.User);
    expect(record_lean).toHaveProperty('id', String(user.id));
    expect(record_lean).toHaveProperty('name', user.name);
    expect(record_lean).toHaveProperty('age', user.age);
  });

  it('record_id_as_string and no select id', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    models.User.query_record_id_as_string = true;
    const record = await models.User.find(user.id).select(['name', 'age']);
    const record_lean = await models.User.find(user.id).select(['name', 'age']).lean();
    models.User.query_record_id_as_string = false;
    expect(record).toEqual({ id: null, name: user.name, age: user.age });
    expect(record_lean).toEqual({ name: user.name, age: user.age });
  });
}
