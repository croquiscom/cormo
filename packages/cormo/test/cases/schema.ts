import { expect } from 'chai';
import * as sinon from 'sinon';
import * as cormo from '../..';

export default function(db: any, db_config: any) {
  let connection!: cormo.Connection;
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    connection = new cormo.Connection(db, db_config);
  });

  afterEach(async () => {
    await connection.dropAllModels();
    connection.close();
    sandbox.restore();
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
    expect(await connection.getSchemaChanges()).to.eql([
      { message: 'Add index on users age' },
    ]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(true);

    await connection.applySchemas();
    expect(await connection.getSchemaChanges()).to.eql([]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(false);

    try {
      // can not add same age with unique index
      await User.create({ name: 'Jone Doe', age: 27 });
      throw new Error('must throw an error.');
    } catch (error) {
      // 'duplicated email' or 'duplicated'
      expect(error.message).to.match(/^duplicated( age)?$/);
    }
  });

  it('index on foreign key', async () => {
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.Column(String)
      public name?: string | null;

      @cormo.Column(Number)
      public age?: number | null;
    }

    @cormo.Model()
    @cormo.Index({ user_id: 1 })
    class Post extends cormo.BaseModel {
      @cormo.Column(String)
      public title?: string | null;

      @cormo.Column(String)
      public body?: string | null;

      @cormo.BelongsTo()
      public user?: () => User | null;

      public user_id?: number | null;
    }

    await connection.applySchemas();
  });

  it('applySchemas successes if an index already exist', async () => {
    class User extends cormo.BaseModel { }
    User.index({ name: 1, age: 1 });
    User.column('name', String);
    User.column('age', Number);
    expect(await connection.getSchemaChanges()).to.eql([
      { message: 'Add table users' },
      { message: 'Add index on users name,age' },
    ]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(true);

    await connection.applySchemas();
    expect(await connection.getSchemaChanges()).to.eql([]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(false);

    User.column('address', String);
    if (db !== 'mongodb') {
      expect(await connection.getSchemaChanges()).to.eql([
        { message: 'Add column address to users' },
      ]);
      expect(await connection.isApplyingSchemasNecessary()).to.eql(true);
    } else {
      expect(await connection.getSchemaChanges()).to.eql([]);
      expect(await connection.isApplyingSchemasNecessary()).to.eql(false);
    }

    await connection.applySchemas();
    expect(await connection.getSchemaChanges()).to.eql([]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(false);
  });

  it('add column', async () => {
    class User extends cormo.BaseModel { }
    User.column('name', String);
    User.column('age', Number);
    expect(await connection.getSchemaChanges()).to.eql([
      { message: 'Add table users' },
    ]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(true);

    await connection.applySchemas();
    expect(await connection.getSchemaChanges()).to.eql([]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(false);

    User.column('address', String);
    if (db !== 'mongodb') {
      expect(await connection.getSchemaChanges()).to.eql([
        { message: 'Add column address to users' },
      ]);
      expect(await connection.isApplyingSchemasNecessary()).to.eql(true);
    } else {
      expect(await connection.getSchemaChanges()).to.eql([]);
      expect(await connection.isApplyingSchemasNecessary()).to.eql(false);
    }

    const user1 = await User.create({ name: 'John Doe', age: 27, address: 'Moon' });
    expect(await connection.getSchemaChanges()).to.eql([]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(false);
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
    expect(await connection.getSchemaChanges()).to.eql([
      { message: 'Add table people' },
      { message: 'Add table User' },
      { message: 'Add table Guest' },
    ]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(true);

    await connection.applySchemas();
    expect(await connection.getSchemaChanges()).to.eql([]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(false);

    const schema = await (connection._adapter as any).getSchemas();
    const table_names = Object.keys(schema.tables);
    expect(table_names.sort()).to.eql(['Guest', 'User', 'people']);
  });

  it('column name', async () => {
    @cormo.Model({ name: 'users' })
    @cormo.Index({ n: 1 })
    class User1 extends cormo.BaseModel {
      @cormo.Column(String)
      public n!: string;

      @cormo.Column(Number)
      public a!: number;
    }
    expect(await connection.getSchemaChanges()).to.eql([
      { message: 'Add table users' },
      { message: 'Add index on users n' },
    ]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(true);

    // must create table before define an alias Model
    await connection.applySchemas();
    expect(await connection.getSchemaChanges()).to.eql([]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(false);

    @cormo.Model({ name: 'users' })
    @cormo.Index({ name: 1 })
    class User2 extends cormo.BaseModel {
      @cormo.Column({ type: String, name: 'n' })
      public name!: string;

      @cormo.Column({ type: Number, name: 'a' })
      public age!: number;
    }
    expect(await connection.getSchemaChanges()).to.eql([]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(false); // no table to create

    await connection.applySchemas();
    expect(await connection.getSchemaChanges()).to.eql([]);
    expect(await connection.isApplyingSchemasNecessary()).to.eql(false);

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

    // group
    expect(await User2.group(['name'], { max_age: { $max: '$age' } }).order('name')).to.eql([
      { name: 'Bill Smith', max_age: 28 },
      { name: 'Jone Doe', max_age: 36 },
    ]);
  });

  it('column name alias for indexed column', async () => {
    @cormo.Model()
    @cormo.Index({ name: 1 })
    class User extends cormo.BaseModel {
      @cormo.Column({ type: String, name: 'n' })
      public name!: string;

      @cormo.Column({ type: Number, name: 'a' })
      public age!: number;
    }
    await connection.applySchemas();
  });

  it('default value', async () => {
    sandbox.useFakeTimers(new Date(2018, 8, 21, 17, 13));

    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.Column({ type: String, required: true, default_value: 'unknown' })
      public name!: string;

      @cormo.Column({ type: Number, default_value: -1 })
      public age?: number;

      @cormo.Column({ type: Date, required: true, default_value: Date.now })
      public created_at!: Date;
    }

    // create with values
    const user1 = new User();
    user1.name = 'Jone Doe';
    user1.age = 27;
    user1.created_at = new Date(2018, 7, 3, 5, 24);
    await user1.save();
    // create without values
    const user2 = new User();
    await user2.save();

    expect(await User.where().order('id')).to.eql([
      { id: user1.id, name: 'Jone Doe', age: 27, created_at: new Date(2018, 7, 3, 5, 24) },
      { id: user2.id, name: 'unknown', age: -1, created_at: new Date(2018, 8, 21, 17, 13) },
    ]);
  });

  it('default value', async () => {
    sandbox.useFakeTimers(new Date(2018, 8, 21, 17, 13));

    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.Column({ type: String, required: true, default_value: 'unknown' })
      public name!: string;

      @cormo.Column({ type: Number, default_value: -1 })
      public age?: number;

      @cormo.Column({ type: Date, required: true, default_value: Date.now })
      public created_at!: Date;
    }

    // create with values
    const user1 = new User();
    user1.name = 'Jone Doe';
    user1.age = 27;
    user1.created_at = new Date(2018, 7, 3, 5, 24);
    await user1.save();
    // create without values
    const user2 = new User();
    await user2.save();

    expect(await User.where().order('id')).to.eql([
      { id: user1.id, name: 'Jone Doe', age: 27, created_at: new Date(2018, 7, 3, 5, 24) },
      { id: user2.id, name: 'unknown', age: -1, created_at: new Date(2018, 8, 21, 17, 13) },
    ]);
  });

  it('default value with createBulk', async () => {
    sandbox.useFakeTimers(new Date(2018, 8, 21, 17, 13));

    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.Column({ type: String, required: true, default_value: 'unknown' })
      public name!: string;

      @cormo.Column({ type: Number, default_value: -1 })
      public age?: number;

      @cormo.Column({ type: Date, required: true, default_value: Date.now })
      public created_at!: Date;
    }

    // create with values
    const users = await User.createBulk([
      { name: 'Jone Doe', age: 27, created_at: new Date(2018, 7, 3, 5, 24) },
      {} as User, // create without values
    ]);

    expect(await User.where().order('id')).to.eql([
      { id: users[0].id, name: 'Jone Doe', age: 27, created_at: new Date(2018, 7, 3, 5, 24) },
      { id: users[1].id, name: 'unknown', age: -1, created_at: new Date(2018, 8, 21, 17, 13) },
    ]);
  });
}
