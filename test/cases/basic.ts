// tslint:disable:no-unused-expression

import { expect } from 'chai';
import * as cormo from '../..';

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

export default function(models: {
  User: typeof User,
}) {
  it('create one', () => {
    const user = new models.User();
    user.name = 'John Doe';
    user.age = 27;
    expect(user).to.have.property('name', 'John Doe');
    expect(user).to.have.property('age', 27);
  });

  it('initialize in constructor', () => {
    const user = new models.User({ name: 'John Doe', age: 27 });
    expect(user).to.have.property('name', 'John Doe');
    expect(user).to.have.property('age', 27);
  });

  it('build method', () => {
    const user = models.User.build({ name: 'John Doe', age: 27 });
    expect(user).to.have.property('name', 'John Doe');
    expect(user).to.have.property('age', 27);
  });

  it('add a new record to the database', async () => {
    const user = new models.User({ name: 'John Doe', age: 27 });
    await user.save();
    expect(user).to.have.keys('id', 'name', 'age');
  });

  it('create method', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    expect(user).to.be.an.instanceof(models.User);
    expect(user).to.have.keys('id', 'name', 'age');
    expect(user.id).to.exist;
  });

  it('find a record', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const record = await models.User.find(user.id);
    expect(record).to.exist;
    expect(record).to.be.an.instanceof(models.User);
    expect(record).to.have.property('id', user.id);
    expect(record).to.have.property('name', user.name);
    expect(record).to.have.property('age', user.age);
  });

  it('find non-existing record', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const id = _getInvalidID(user.id);
    try {
      await models.User.find(id);
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.equal('not found');
    }
  });

  it('find undefined', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    try {
      await models.User.find(undefined as any);
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.equal('not found');
    }
  });

  it('find undefined with condition', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    try {
      await models.User.find(undefined as any).where({ age: { $gt: 0 } });
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.equal('not found');
    }
  });

  it('update a record', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    user.name = 'Bill Smith';
    const record1 = await models.User.find(user.id);
    // not yet saved, you will get previous values
    expect(record1).to.exist;
    expect(record1).to.have.property('id', user.id);
    expect(record1).to.have.property('name', 'John Doe');
    expect(record1).to.have.property('age', 27);
    await user.save();
    const record2 = await models.User.find(user.id);
    expect(record2).to.exist;
    expect(record2).to.have.property('id', user.id);
    expect(record2).to.have.property('name', 'Bill Smith');
    expect(record2).to.have.property('age', 27);
  });

  it('destroy a record', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const record = await models.User.find(user.id);
    expect(record).to.exist;
    expect(record).to.have.property('id', user.id);
    expect(record).to.have.property('name', 'John Doe');
    expect(record).to.have.property('age', 27);
    await user.destroy();
    try {
      await models.User.find(user.id);
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.equal('not found');
    }
  });

  it('destroy a new record', async () => {
    const user = models.User.build({ name: 'John Doe', age: 27 });
    await user.destroy();
  });

  it('try to create with extra data', async () => {
    const user = new models.User({ id: 1, name: 'John Doe', age: 27, extra: 'extra' });
    expect(user).to.have.property('id', null);
    expect(user).to.not.have.property('extra');
    try {
      (user as any).id = 1;
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.have.string("Cannot assign to read only property 'id' of object ");
    }
    expect(user).to.have.property('id', null); // id is read only
    (user as any).extra = 'extra';
    expect(user).to.have.property('extra', 'extra');
    const record1 = await user.save();
    expect(user).to.equal(record1);
    expect(user).to.have.property('extra', 'extra');
    const record2 = await models.User.find(user.id);
    expect(record2).to.have.property('id', user.id);
    expect(record2).to.have.property('name', user.name);
    expect(record2).to.have.property('age', user.age);
    expect(record2).to.not.have.property('extra');
  });

  it('delete some fields', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    user.name = null;
    user.age = null;
    const record1 = await user.save();
    expect(user).to.equal(record1);
    const record2 = await models.User.find(user.id);
    expect(record2).to.have.keys('id', 'name', 'age');
    expect(record2).to.have.property('name', null);
    expect(record2).to.have.property('age', null);
  });

  it('find records', async () => {
    const users = await Promise.all([
      models.User.create({ name: 'John Doe', age: 27 }),
      models.User.create({ name: 'Bill Smith', age: 45 }),
      models.User.create({ name: 'Alice Jackson', age: 27 }),
    ]);
    users.sort((a, b) => a.id < b.id ? -1 : 1);
    const records = await models.User.find([users[0].id, users[1].id]);
    records.sort((a, b) => a.id < b.id ? -1 : 1);
    expect(records[0]).to.be.an.instanceof(models.User);
    expect(records[1]).to.be.an.instanceof(models.User);
    expect(records[0]).to.eql(users[0]);
    expect(records[1]).to.eql(users[1]);
  });

  it('find records with non-existing id', async () => {
    const users = await Promise.all([
      models.User.create({ name: 'John Doe', age: 27 }),
      models.User.create({ name: 'Bill Smith', age: 45 }),
      models.User.create({ name: 'Alice Jackson', age: 27 }),
    ]);
    users.sort((a, b) => a.id < b.id ? -1 : 1);
    try {
      await models.User.find([users[2].id, users[1].id, _getInvalidID(users[0].id)]);
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.equal('not found');
    }
  });

  it('find records duplicate', async () => {
    const users = await Promise.all([
      models.User.create({ name: 'John Doe', age: 27 }),
      models.User.create({ name: 'Bill Smith', age: 45 }),
      models.User.create({ name: 'Alice Jackson', age: 27 }),
    ]);
    users.sort((a, b) => a.id < b.id ? -1 : 1);
    const records = await models.User.find([users[2].id, users[0].id, users[0].id, users[0].id, users[2].id]);
    records.sort((a, b) => a.id < b.id ? -1 : 1);
    expect(records[0]).to.be.an.instanceof(models.User);
    expect(records[1]).to.be.an.instanceof(models.User);
    expect(records[0]).to.eql(users[0]);
    expect(records[1]).to.eql(users[2]);
  });

  it('find while preserving order', async () => {
    const users = await Promise.all([
      models.User.create({ name: 'John Doe', age: 27 }),
      models.User.create({ name: 'Bill Smith', age: 45 }),
      models.User.create({ name: 'Alice Jackson', age: 27 }),
    ]);
    const records = await models.User.findPreserve([users[2].id, users[0].id, users[0].id, users[0].id, users[2].id]);
    expect(records).to.have.length(5);
    expect(records[0]).to.eql(users[2]);
    expect(records[1]).to.eql(users[0]);
    expect(records[2]).to.eql(users[0]);
    expect(records[3]).to.eql(users[0]);
    expect(records[4]).to.eql(users[2]);
  });

  it('createBulk', async () => {
    const data = [
      { name: 'John Doe', age: 27 },
      { name: 'Bill Smith', age: 45 },
      { name: 'Alice Jackson', age: 27 },
    ];
    const users = await models.User.createBulk(data);
    expect(users).to.exist;
    expect(users).to.be.an.instanceof(Array);
    expect(users).to.have.length(3);
    for (const user of users) {
      expect(user).to.be.an.instanceof(models.User);
      expect(user).to.have.keys('id', 'name', 'age');
      expect(user.id).to.exist;
      const record = await models.User.find(user.id);
      expect(user).to.eql(record);
    }
  });

  it('dirty', async () => {
    if (!models.User.dirty_tracking) {
      return;
    }
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    expect(user.isDirty()).to.equal(false);
    expect(user.getChanged()).to.eql([]);
    expect(user.getPrevious('name')).to.not.exist;
    user.name = 'Bill Smith';
    expect(user.isDirty()).to.equal(true);
    expect(user.getChanged()).to.eql(['name']);
    expect(user.getPrevious('name')).to.equal('John Doe');
    user.name = 'Alice Jackson';
    expect(user.isDirty()).to.equal(true);
    expect(user.getChanged()).to.eql(['name']);
    expect(user.getPrevious('name')).to.equal('John Doe');
    user.age = 10;
    expect(user.isDirty()).to.equal(true);
    expect(user.getChanged().sort()).to.eql(['age', 'name']);
    expect(user.getPrevious('name')).to.equal('John Doe');
    expect(user.getPrevious('age')).to.equal(27);
    user.reset();
    expect(user.name).to.equal('John Doe');
    expect(user.age).to.equal(27);
    expect(user.isDirty()).to.equal(false);
    expect(user.getChanged()).to.eql([]);
    expect(user.getPrevious('name')).to.not.exist;
  });

  it('dirty after save', async () => {
    if (!models.User.dirty_tracking) {
      return;
    }
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    user.name = 'Bill Smith';
    expect(user.isDirty()).to.equal(true);
    expect(user.getChanged()).to.eql(['name']);
    await user.save();
    expect(user.isDirty()).to.equal(false);
    expect(user.getChanged()).to.eql([]);
  });

  it('get & set', () => {
    const user = new models.User({ name: 'John Doe', age: 27 });
    expect(user.get('name')).to.equal('John Doe');
    expect(user.get('age')).to.equal(27);
    user.set('name', 'Bill Smith');
    expect(user.get('name')).to.equal('Bill Smith');
  });
}
