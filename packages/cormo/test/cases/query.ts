import { expect, it } from 'vitest';
import * as cormo from '../../src/index.js';

export class UserRef extends cormo.BaseModel {
  public name?: string | null;

  public age?: number | null;
}

export type UserRefVO = cormo.ModelValueObject<UserRef>;

export class LedgerRef extends cormo.BaseModel {
  public date_ymd?: number | null;

  public debit?: number | null;

  public credit?: number | null;

  public balance?: number | null;
}

export type LedgerRefVO = cormo.ModelValueObject<LedgerRef>;

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
  it('simple where', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: 27 });
    expect(users).toHaveLength(2);
    users.sort((a, b) => (a.name! < b.name! ? -1 : 1));
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
  });

  it('where chain', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: 27 }).where({ name: 'Alice Jackson' });
    expect(users).toHaveLength(1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
  });

  it('id', async () => {
    const target = (await _createUsers(models.User))[0];
    const users = await models.User.where({ id: target.id });
    expect(users).toHaveLength(1);
    _compareUser(users[0], target);
  });

  it('implicit and', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: 27, name: 'Alice Jackson' });
    expect(users).toHaveLength(1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
  });

  it('$or', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ $or: [{ age: 32 }, { name: 'John Doe' }] });
    expect(users).toHaveLength(2);
    users.sort((a, b) => (a.name! < b.name! ? -1 : 1));
    _compareUser(users[0], { name: 'Gina Baker', age: 32 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
  });

  it('count none', async () => {
    const count = await models.User.count();
    expect(count).toBe(0);
  });

  it('count all', async () => {
    await _createUsers(models.User);
    const count = await models.User.count();
    expect(count).toBe(5);
  });

  it('count condition', async () => {
    await _createUsers(models.User);
    const count = await models.User.count({ age: 27 });
    expect(count).toBe(2);
  });

  it('select must ignored for count', async () => {
    await _createUsers(models.User);
    const count = await models.User.where({ age: 27 }).select(['id', 'name', 'age']).count();
    expect(count).toBe(2);
  });

  it('delete all', async () => {
    await _createUsers(models.User);
    const count = await models.User.delete();
    expect(count).toBe(5);
    const users = await models.User.where();
    expect(users).toHaveLength(0);
  });

  it('delete condition', async () => {
    await _createUsers(models.User);
    const count = await models.User.delete({ age: 27 });
    expect(count).toBe(2);
    const users = await models.User.where();
    expect(users).toHaveLength(3);
    users.sort((a, b) => (a.name! < b.name! ? -1 : 1));
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[2], { name: 'Gina Baker', age: 32 });
  });

  it('limit', async () => {
    await _createUsers(models.User);
    let users = await models.User.query();
    expect(users).toHaveLength(5);
    users = await models.User.query().limit(3);
    expect(users).toHaveLength(3);
    users = await models.User.where({ age: { $lt: 40 } });
    expect(users).toHaveLength(4);
    users = await models.User.where({ age: { $lt: 40 } }).limit(1);
    expect(users).toHaveLength(1);
    expect(users[0]).toHaveProperty('name');
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

  it('delete limit', async () => {
    await _createUsers(models.User);
    const count = await models.User.where({ age: { $lt: 40 } })
      .limit(2)
      .delete();
    expect(count).toBe(2);
    const users = await models.User.where().order('name');
    expect(users).toHaveLength(3);
  });

  it('delete limit with order', async () => {
    await _createUsers(models.User);
    const count = await models.User.where({ age: { $lt: 40 } })
      .order('age name')
      .limit(2)
      .delete();
    expect(count).toBe(2);
    const users = await models.User.where().order('name');
    expect(users).toHaveLength(3);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Gina Baker', age: 32 });
    _compareUser(users[2], { name: 'John Doe', age: 27 });
  });

  it('one', async () => {
    await _createUsers(models.User);
    let user = (await models.User.where({ age: { $lt: 40 } }).one())!;
    expect(user).toHaveProperty('name');
    if (user.name === 'Alice Jackson') {
      _compareUser(user, { name: 'Alice Jackson', age: 27 });
    } else if (user.name === 'John Doe') {
      _compareUser(user, { name: 'John Doe', age: 27 });
    } else if (user.name === 'Gina Baker') {
      _compareUser(user, { name: 'Gina Baker', age: 32 });
    } else {
      _compareUser(user, { name: 'Daniel Smith', age: 8 });
    }
    user = (await models.User.where({ age: { $lt: 5 } }).one())!;
    expect(user).not.toExist();
  });

  it('skip', async () => {
    await _createUsers(models.User);
    let users = await models.User.query().order('age').skip(3);
    expect(users).toHaveLength(2);
    _compareUser(users[0], { name: 'Gina Baker', age: 32 });
    _compareUser(users[1], { name: 'Bill Smith', age: 45 });
    users = await models.User.query().order('age').skip(1).limit(2);
    expect(users).toHaveLength(2);
    users.sort((a, b) => (a.name! < b.name! ? -1 : 1));
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
  });

  it('select', async () => {
    await _createUsers(models.User);
    const users1 = await models.User.select();
    expect(users1[0]).toHaveKeys('id', 'name', 'age');
    const users2 = await models.User.select('name age address');
    expect(users2[0]).toHaveKeys('id', 'name', 'age');
    const users3 = await models.User.select('name');
    expect(users3[0]).toHaveKeys('id', 'name');
    const users4 = await models.User.select('');
    expect(users4[0]).toHaveKeys('id');
  });

  it('select with string array', async () => {
    await _createUsers(models.User);
    const users1 = await models.User.select();
    expect(users1[0]).toHaveKeys('id', 'name', 'age');
    const users2 = await models.User.select(['id', 'name', 'age', 'address'] as any);
    expect(users2[0]).toHaveKeys('id', 'name', 'age');
    const users3 = await models.User.select(['id', 'name']);
    expect(users3[0]).toHaveKeys('id', 'name');
    const users4 = await models.User.select([]);
    expect(users4[0]).toHaveKeys('id', 'name', 'age');
    const users5 = await models.User.select([''] as any);
    expect(users5[0]).toHaveKeys('id', 'name', 'age');
  });

  it('select without id', async () => {
    const sources = await _createUsers(models.User);

    const user = await models.User.find(sources[0].id).select(['name', 'age']);
    expect(user).toHaveKeys('id', 'name', 'age');
    expect((user as any).id).toBeNull();
    expect(user.name).toEqual(sources[0].name);
    expect(user.age).toEqual(sources[0].age);

    // save affects no records
    user.age = 50;
    await (user as any).save();

    const users = await models.User.where();
    expect(users).toHaveLength(5);
    users.sort((a, b) => (a.name! < b.name! ? -1 : 1));
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'Bill Smith', age: 45 });
    _compareUser(users[2], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[3], { name: 'Gina Baker', age: 32 });
    _compareUser(users[4], { name: 'John Doe', age: 27 });
  });

  it('select override', async () => {
    await _createUsers(models.User);
    const users1 = await models.User.select('name').select('age');
    expect(users1[0]).toHaveKeys('id', 'age');
    const users2 = await models.User.select(['name']).select(['age']);
    expect(users2[0]).toHaveKeys('id', 'age');
  });

  it('selectSingle', async () => {
    const sources = await _createUsers(models.User);
    const user_ids = await models.User.query().selectSingle('id');
    expect(user_ids).toEqual([sources[0].id, sources[1].id, sources[2].id, sources[3].id, sources[4].id]);
    const user_names = await models.User.query().selectSingle('name');
    expect(user_names.sort()).toEqual(['Alice Jackson', 'Bill Smith', 'Daniel Smith', 'Gina Baker', 'John Doe']);
    const user_ages = await models.User.query().selectSingle('age');
    expect(user_ages.sort()).toEqual([27, 27, 32, 45, 8]);
    const users = await models.User.query().selectSingle('name').select(['age']);
    expect(users[0]).toHaveKeys('id', 'age');
  });

  it('selectSingle for single record', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });

    expect(await models.User.find(user.id).selectSingle('id')).toEqual(user.id);
    expect(await models.User.find(user.id).selectSingle('name')).toEqual(user.name);
    expect(await models.User.find(user.id).selectSingle('age')).toEqual(user.age);

    expect(await models.User.where({ id: user.id }).one().selectSingle('id')).toEqual(user.id);
    expect(await models.User.where({ id: user.id }).one().selectSingle('name')).toEqual(user.name);
    expect(await models.User.where({ id: user.id }).one().selectSingle('age')).toEqual(user.age);

    expect(
      await models.User.where({ id: _getInvalidID(user.id) })
        .one()
        .selectSingle('id'),
    ).toEqual(null);
    expect(
      await models.User.where({ id: _getInvalidID(user.id) })
        .one()
        .selectSingle('name'),
    ).toEqual(null);
    expect(
      await models.User.where({ id: _getInvalidID(user.id) })
        .one()
        .selectSingle('age'),
    ).toEqual(null);
  });

  it('order (string)', async () => {
    await _createUsers(models.User);
    let users = await models.User.order('name');
    expect(users).toHaveLength(5);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'Bill Smith', age: 45 });
    _compareUser(users[2], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[3], { name: 'Gina Baker', age: 32 });
    _compareUser(users[4], { name: 'John Doe', age: 27 });
    users = await models.User.order('-name');
    expect(users).toHaveLength(5);
    _compareUser(users[0], { name: 'John Doe', age: 27 });
    _compareUser(users[1], { name: 'Gina Baker', age: 32 });
    _compareUser(users[2], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[3], { name: 'Bill Smith', age: 45 });
    _compareUser(users[4], { name: 'Alice Jackson', age: 27 });
  });

  it('order (number)', async () => {
    await _createUsers(models.User);
    let users = await models.User.order('age');
    expect(users).toHaveLength(5);
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
    expect(users).toHaveLength(5);
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
    expect(users).toHaveLength(5);
    _compareUser(users[0], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[1], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[2], { name: 'John Doe', age: 27 });
    _compareUser(users[3], { name: 'Gina Baker', age: 32 });
    _compareUser(users[4], { name: 'Bill Smith', age: 45 });
    users = await models.User.order('age -name');
    expect(users).toHaveLength(5);
    _compareUser(users[0], { name: 'Daniel Smith', age: 8 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
    _compareUser(users[2], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[3], { name: 'Gina Baker', age: 32 });
    _compareUser(users[4], { name: 'Bill Smith', age: 45 });
  });

  it('order (id)', async () => {
    const sources = await _createUsers(models.User);
    sources.sort((a, b) => (a.id < b.id ? -1 : 1));
    let users = await models.User.order('id');
    expect(users).toHaveLength(5);
    for (let i = 0; i <= 4; i++) {
      _compareUser(users[i], sources[i]);
    }
    users = await models.User.order('-id');
    expect(users).toHaveLength(5);
    for (let i = 0; i <= 4; i++) {
      _compareUser(users[i], sources[4 - i]);
    }
  });
}
