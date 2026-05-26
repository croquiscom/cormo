import { expect, it } from 'vitest';
import * as cormo from '../../src/index.js';

export class User extends cormo.BaseModel {
  public name!: string | null;
  public age!: number | null;
}

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

function getFixedId(db: string): any {
  if (db === 'mongodb') {
    return '0123456789abcdef0123567';
  } else {
    return 1234567;
  }
}

export default function (models: { User: typeof User }, db: string) {
  it('create one', () => {
    const user = new models.User();
    user.name = 'John Doe';
    user.age = 27;
    expect(user).toHaveProperty('name', 'John Doe');
    expect(user).toHaveProperty('age', 27);
  });

  it('initialize in constructor', () => {
    const user = new models.User({ name: 'John Doe', age: 27 });
    expect(user).toHaveProperty('name', 'John Doe');
    expect(user).toHaveProperty('age', 27);
  });

  it('build method', () => {
    const user = models.User.build({ name: 'John Doe', age: 27 });
    expect(user).toHaveProperty('name', 'John Doe');
    expect(user).toHaveProperty('age', 27);
  });

  it('add a new record to the database', async () => {
    const user = new models.User({ name: 'John Doe', age: 27 });
    await user.save();
    expect(user).toHaveKeys('id', 'name', 'age');
  });

  it('create method', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    expect(user).toBeInstanceOf(models.User);
    expect(user).toHaveKeys('id', 'name', 'age');
    expect(user.id).toExist();
  });

  it('string id for created', async () => {
    models.User.query_record_id_as_string = true;
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    models.User.query_record_id_as_string = false;
    expect(user).toBeInstanceOf(models.User);
    expect(user).toHaveKeys('id', 'name', 'age');
    expect(user.id).toExist();
    expect(user.id).toBeType('string');
  });

  it('create with id', async () => {
    const fixed_id = getFixedId(db);
    const user = await models.User.create({ name: 'John Doe', age: 27, id: fixed_id + 0 }, { use_id_in_data: true });
    expect(user.id).toEqual(fixed_id + 0);
  });

  it('create without id', async () => {
    const fixed_id = getFixedId(db);
    const user = await models.User.create({ name: 'John Doe', age: 27, id: fixed_id + 0 } as any, {
      use_id_in_data: false,
    });
    expect(user.id).not.toEqual(fixed_id + 0);
  });

  it('find a record', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const record = await models.User.find(user.id);
    expect(record).toExist();
    expect(record).toBeInstanceOf(models.User);
    expect(record).toHaveProperty('id', user.id);
    expect(record).toHaveProperty('name', user.name);
    expect(record).toHaveProperty('age', user.age);
  });

  it('find non-existing record', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const id = _getInvalidID(user.id);
    try {
      await models.User.find(id);
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('not found');
    }
  });

  it('find undefined', async () => {
    const _user = await models.User.create({ name: 'John Doe', age: 27 });
    try {
      await models.User.find(undefined as any);
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('not found');
    }
  });

  it('find undefined with condition', async () => {
    const _user = await models.User.create({ name: 'John Doe', age: 27 });
    try {
      await models.User.find(undefined as any).where({ age: { $gt: 0 } });
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('not found');
    }
  });

  it('update a record', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    user.name = 'Bill Smith';
    const record1 = await models.User.find(user.id);
    // not yet saved, you will get previous values
    expect(record1).toExist();
    expect(record1).toHaveProperty('id', user.id);
    expect(record1).toHaveProperty('name', 'John Doe');
    expect(record1).toHaveProperty('age', 27);
    await user.save();
    const record2 = await models.User.find(user.id);
    expect(record2).toExist();
    expect(record2).toHaveProperty('id', user.id);
    expect(record2).toHaveProperty('name', 'Bill Smith');
    expect(record2).toHaveProperty('age', 27);
  });

  it('destroy a record', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const record = await models.User.find(user.id);
    expect(record).toExist();
    expect(record).toHaveProperty('id', user.id);
    expect(record).toHaveProperty('name', 'John Doe');
    expect(record).toHaveProperty('age', 27);
    await user.destroy();
    try {
      await models.User.find(user.id);
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('not found');
    }
  });

  it('destroy a new record', async () => {
    const user = models.User.build({ name: 'John Doe', age: 27 });
    await user.destroy();
  });

  it('try to create with extra data', async () => {
    const user = new models.User({ id: 1, name: 'John Doe', age: 27, extra: 'extra' });
    expect(user).toHaveProperty('id', null);
    expect(user).not.toHaveProperty('extra');
    try {
      (user as any).id = 1;
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain("Cannot assign to read only property 'id' of object ");
    }
    expect(user).toHaveProperty('id', null); // id is read only
    (user as any).extra = 'extra';
    expect(user).toHaveProperty('extra', 'extra');
    const record1 = await user.save();
    expect(user).toBe(record1);
    expect(user).toHaveProperty('extra', 'extra');
    const record2 = await models.User.find(user.id);
    expect(record2).toHaveProperty('id', user.id);
    expect(record2).toHaveProperty('name', user.name);
    expect(record2).toHaveProperty('age', user.age);
    expect(record2).not.toHaveProperty('extra');
  });

  it('delete some fields', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    user.name = null;
    user.age = null;
    const record1 = await user.save();
    expect(user).toBe(record1);
    const record2 = await models.User.find(user.id);
    expect(record2).toHaveKeys('id', 'name', 'age');
    expect(record2).toHaveProperty('name', null);
    expect(record2).toHaveProperty('age', null);
  });

  it('find records', async () => {
    const users = await Promise.all([
      models.User.create({ name: 'John Doe', age: 27 }),
      models.User.create({ name: 'Bill Smith', age: 45 }),
      models.User.create({ name: 'Alice Jackson', age: 27 }),
    ]);
    users.sort((a, b) => (a.id < b.id ? -1 : 1));
    const records = await models.User.find([users[0].id, users[1].id]);
    records.sort((a, b) => (a.id < b.id ? -1 : 1));
    expect(records[0]).toBeInstanceOf(models.User);
    expect(records[1]).toBeInstanceOf(models.User);
    expect(records[0]).toEqual(users[0]);
    expect(records[1]).toEqual(users[1]);
  });

  it('find records with non-existing id', async () => {
    const users = await Promise.all([
      models.User.create({ name: 'John Doe', age: 27 }),
      models.User.create({ name: 'Bill Smith', age: 45 }),
      models.User.create({ name: 'Alice Jackson', age: 27 }),
    ]);
    users.sort((a, b) => (a.id < b.id ? -1 : 1));
    try {
      await models.User.find([users[2].id, users[1].id, _getInvalidID(users[0].id)]);
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('not found');
    }
  });

  it('find records duplicate', async () => {
    const users = await Promise.all([
      models.User.create({ name: 'John Doe', age: 27 }),
      models.User.create({ name: 'Bill Smith', age: 45 }),
      models.User.create({ name: 'Alice Jackson', age: 27 }),
    ]);
    users.sort((a, b) => (a.id < b.id ? -1 : 1));
    const records = await models.User.find([users[2].id, users[0].id, users[0].id, users[0].id, users[2].id]);
    records.sort((a, b) => (a.id < b.id ? -1 : 1));
    expect(records[0]).toBeInstanceOf(models.User);
    expect(records[1]).toBeInstanceOf(models.User);
    expect(records[0]).toEqual(users[0]);
    expect(records[1]).toEqual(users[2]);
  });

  it('find while preserving order', async () => {
    const users = await Promise.all([
      models.User.create({ name: 'John Doe', age: 27 }),
      models.User.create({ name: 'Bill Smith', age: 45 }),
      models.User.create({ name: 'Alice Jackson', age: 27 }),
    ]);
    const records = await models.User.findPreserve([users[2].id, users[0].id, users[0].id, users[0].id, users[2].id]);
    expect(records).toHaveLength(5);
    expect(records[0]).toEqual(users[2]);
    expect(records[1]).toEqual(users[0]);
    expect(records[2]).toEqual(users[0]);
    expect(records[3]).toEqual(users[0]);
    expect(records[4]).toEqual(users[2]);
  });

  it('createBulk', async () => {
    const data = [
      { name: 'John Doe', age: 27 },
      { name: 'Bill Smith', age: 45 },
      { name: 'Alice Jackson', age: 27 },
    ];
    const users = await models.User.createBulk(data);
    expect(users).toExist();
    expect(users).toBeInstanceOf(Array);
    expect(users).toHaveLength(3);
    for (const user of users) {
      expect(user).toBeInstanceOf(models.User);
      expect(user).toHaveKeys('id', 'name', 'age');
      expect(user.id).toExist();
      const record = await models.User.find(user.id);
      expect(user).toEqual(record);
    }
  });

  it('string id for createBulk', async () => {
    const data = [
      { name: 'John Doe', age: 27 },
      { name: 'Bill Smith', age: 45 },
      { name: 'Alice Jackson', age: 27 },
    ];
    models.User.query_record_id_as_string = true;
    const users = await models.User.createBulk(data);
    models.User.query_record_id_as_string = false;
    expect(users).toExist();
    expect(users).toBeInstanceOf(Array);
    expect(users).toHaveLength(3);
    for (const user of users) {
      expect(user).toBeInstanceOf(models.User);
      expect(user).toHaveKeys('id', 'name', 'age');
      expect(user.id).toExist();
      expect(user.id).toBeType('string');
      models.User.query_record_id_as_string = true;
      const record = await models.User.find(user.id);
      models.User.query_record_id_as_string = false;
      expect(user).toEqual(record);
    }
  });

  it('createBulk with id', async () => {
    const fixed_id = getFixedId(db);
    const data = [
      { name: 'John Doe', age: 27, id: fixed_id + 0 },
      { name: 'Bill Smith', age: 45, id: fixed_id + 1 },
      { name: 'Alice Jackson', age: 27, id: fixed_id + 2 },
    ];
    const users = await models.User.createBulk(data, { use_id_in_data: true });
    for (const user of users) {
      expect(user.id).toEqual(data.find((item) => item.name === user.name)!.id);
    }
  });

  it('createBulk without id', async () => {
    const fixed_id = getFixedId(db);
    const data = [
      { name: 'John Doe', age: 27, id: fixed_id + 0 },
      { name: 'Bill Smith', age: 45, id: fixed_id + 1 },
      { name: 'Alice Jackson', age: 27, id: fixed_id + 2 },
    ];
    const users = await models.User.createBulk(data, { use_id_in_data: false });
    for (const user of users) {
      expect(user.id).not.toEqual(data.find((item) => item.name === user.name)!.id);
    }
  });

  it('dirty', async () => {
    if (!models.User.dirty_tracking) {
      return;
    }
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    expect(user.isDirty()).toBe(false);
    expect(user.getChanged()).toEqual([]);
    expect(user.getPrevious('name')).not.toExist();
    user.name = 'Bill Smith';
    expect(user.isDirty()).toBe(true);
    expect(user.getChanged()).toEqual(['name']);
    expect(user.getPrevious('name')).toBe('John Doe');
    user.name = 'Alice Jackson';
    expect(user.isDirty()).toBe(true);
    expect(user.getChanged()).toEqual(['name']);
    expect(user.getPrevious('name')).toBe('John Doe');
    user.age = 10;
    expect(user.isDirty()).toBe(true);
    expect(user.getChanged().sort()).toEqual(['age', 'name']);
    expect(user.getPrevious('name')).toBe('John Doe');
    expect(user.getPrevious('age')).toBe(27);
    user.reset();
    expect(user.name).toBe('John Doe');
    expect(user.age).toBe(27);
    expect(user.isDirty()).toBe(false);
    expect(user.getChanged()).toEqual([]);
    expect(user.getPrevious('name')).not.toExist();
  });

  it('dirty after save', async () => {
    if (!models.User.dirty_tracking) {
      return;
    }
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    user.name = 'Bill Smith';
    expect(user.isDirty()).toBe(true);
    expect(user.getChanged()).toEqual(['name']);
    await user.save();
    expect(user.isDirty()).toBe(false);
    expect(user.getChanged()).toEqual([]);
  });

  it('get & set', () => {
    const user = new models.User({ name: 'John Doe', age: 27 });
    expect(user.get('name')).toBe('John Doe');
    expect(user.get('age')).toBe(27);
    user.set('name', 'Bill Smith');
    expect(user.get('name')).toBe('Bill Smith');
  });
}
