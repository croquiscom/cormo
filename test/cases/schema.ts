// tslint:disable:max-classes-per-file

import { expect } from 'chai';
import * as cormo from '../..';

export default function(models: {
  connection: cormo.Connection | null,
}) {
  afterEach(async () => {
    await models.connection!.dropAllModels();
  });

  it('add index', async () => {
    class User extends cormo.BaseModel { }
    User.column('name', String);
    User.column('age', Number);

    // can add same age without unique index
    const user1 = await User.create({ name: 'John Doe', age: 27 });
    const user2 = await User.create({ name: 'John Doe', age: 27 });

    await user2.destroy();

    // add unique index
    User.index({ age: 1 }, { unique: true });

    await models.connection!.applySchemas();
    try {
      // can not add same age with unique index
      await User.create({ name: 'Jone Doe', age: 27 });
      throw new Error('must throw an error.');
    } catch (error) {
      // 'duplicated email' or 'duplicated'
      expect(error.message).to.match(/^duplicated( age)?$/);
    }
  });

  it('applySchemas successes if an index already exist', async () => {
    class User extends cormo.BaseModel { }
    User.index({ name: 1, age: 1 });
    User.column('name', String);
    User.column('age', Number);

    await models.connection!.applySchemas();

    User.column('address', String);

    await models.connection!.applySchemas();
  });

  it('add column', async () => {
    class User extends cormo.BaseModel { }
    User.column('name', String);
    User.column('age', Number);

    await models.connection!.applySchemas();

    User.column('address', String);

    const user1 = await User.create({ name: 'John Doe', age: 27, address: 'Moon' });
    const user2 = await User.find(user1.id);
    expect(user2).to.have.keys('id', 'name', 'age', 'address');
    expect((user2 as any).address).to.eql('Moon');
  });

  it('table name', async () => {
    // default table name is a pluralized form
    class Person extends cormo.BaseModel { }
    Person.column('name', String);

    // explicitly set name
    class User extends cormo.BaseModel { }
    User.table_name = 'User';
    User.column('name', String);

    // using Decorator
    @cormo.Model({ name: 'Guest' })
    class Guest extends cormo.BaseModel {
      @cormo.Column(String)
      public name!: string;
    }

    await models.connection!.applySchemas();

    const schema = await models.connection!._adapter.getSchemas();
    const table_names = Object.keys(schema.tables);
    expect(table_names.sort()).to.eql(['Guest', 'User', 'people']);
  });

  it('column name', async () => {
    @cormo.Model({ name: 'users' })
    class User1 extends cormo.BaseModel {
      @cormo.Column(String)
      public n!: string;

      @cormo.Column(Number)
      public a!: number;
    }

    // must create table before define an alias Model
    await models.connection!.applySchemas();

    @cormo.Model({ name: 'users' })
    class User2 extends cormo.BaseModel {
      @cormo.Column({ type: String, name: 'n' })
      public name!: string;

      @cormo.Column({ type: Number, name: 'a' })
      public age!: number;
    }

    await models.connection!.applySchemas();

    // create new records
    const user1 = await User1.create({ n: 'Jone Doe', a: 34 });
    const user2 = await User2.create({ name: 'Bill Smith', age: 25 });

    // check database
    expect(await User1.where().order('id')).to.eql([
      { id: user1.id, n: 'Jone Doe', a: 34 },
      { id: user2.id, n: 'Bill Smith', a: 25 },
    ]);
    expect(await User2.where().order('id')).to.eql([
      { id: user1.id, name: 'Jone Doe', age: 34 },
      { id: user2.id, name: 'Bill Smith', age: 25 },
    ]);

    // update records
    await User2.find(user1.id).update({ age: 36 });
    user2.age = 28;
    await user2.save();

    // check database
    expect(await User1.where().order('id')).to.eql([
      { id: user1.id, n: 'Jone Doe', a: 36 },
      { id: user2.id, n: 'Bill Smith', a: 28 },
    ]);
    expect(await User2.where().order('id')).to.eql([
      { id: user1.id, name: 'Jone Doe', age: 36 },
      { id: user2.id, name: 'Bill Smith', age: 28 },
    ]);

    // query
    expect(await User2.where({ name: { $contains: 'Doe' } }).order('id')).to.eql([
      { id: user1.id, name: 'Jone Doe', age: 36 },
    ]);
    expect(await User2.where({ age: 28 }).order('id')).to.eql([
      { id: user2.id, name: 'Bill Smith', age: 28 },
    ]);
  });
}
