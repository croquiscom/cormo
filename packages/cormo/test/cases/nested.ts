import { expect } from 'chai';
import * as cormo from '../../lib/esm/index.js';

export default function (db: any, db_config: any) {
  let connection!: cormo.Connection;

  beforeEach(() => {
    connection = new cormo.Connection(db, db_config);
  });

  afterEach(async () => {
    await connection.dropAllModels();
    connection.close();
  });

  it('define a model, create an instance and fetch it', async () => {
    class Name {
      @cormo.Column(String)
      public first?: string;

      @cormo.Column(String)
      public last?: string;
    }
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name?: Name;
    }
    const user = await User.create({ name: { first: 'John', last: 'Doe' } });
    expect(user).to.have.keys('id', 'name');
    expect(user.name).to.eql({ first: 'John', last: 'Doe' });
    const record = await User.find(user.id);
    expect(record).to.have.keys('id', 'name');
    expect(record.name).to.eql({ first: 'John', last: 'Doe' });
  });

  it('define a model using NestedProperty', async () => {
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.Column({
        first: String,
        last: String,
      })
      public name?: {
        first?: string;
        last?: string;
      };
    }
    const user = await User.create({ name: { first: 'John', last: 'Doe' } });
    expect(user).to.have.keys('id', 'name');
    expect(user.name).to.eql({ first: 'John', last: 'Doe' });
    const record = await User.find(user.id);
    expect(record).to.have.keys('id', 'name');
    expect(record.name).to.eql({ first: 'John', last: 'Doe' });
  });

  it('get a record whose super column is null', async () => {
    class Name {
      @cormo.Column(String)
      public first?: string;

      @cormo.Column(String)
      public last?: string;
    }
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name?: Name;
    }
    const user = await User.create({});
    const record = await User.find(user.id);
    expect(record).to.have.keys('id', 'name');
    expect(record.name).to.be.null;
  });

  it('another style to define a model', async () => {
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.Column(String)
      public ['name.first']?: string;

      @cormo.Column(String)
      public ['name.last']?: string;
    }
    const user = await (User as any).create({ name: { first: 'John', last: 'Doe' } });
    expect(user).to.have.keys('id', 'name');
    expect(user.name).to.eql({ first: 'John', last: 'Doe' });
    const record = await (User as any).find(user.id);
    expect(record).to.have.keys('id', 'name');
    expect(record.name).to.eql({ first: 'John', last: 'Doe' });
  });

  it('constraint', async () => {
    class Name {
      @cormo.Column({ type: String, required: true })
      public first!: string;

      @cormo.Column({ type: String, required: true })
      public last!: string;

      @cormo.Column(String)
      public middle?: string;
    }
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name!: Name;
    }
    const user1 = await User.create({ name: { first: 'John', middle: 'F.', last: 'Doe' } });
    const record1 = await User.find(user1.id);
    expect(record1).to.have.keys('id', 'name');
    expect(record1.name).to.eql({ first: 'John', middle: 'F.', last: 'Doe' });
    // missing non-required field
    const user2 = await User.create({ name: { first: 'John', last: 'Doe' } });
    const record2 = await User.find(user2.id);
    expect(record2).to.have.keys('id', 'name');
    expect(record2.name).to.eql({ first: 'John', middle: null, last: 'Doe' });
    try {
      // missing required field
      await (User as any).create({ name: { first: 'John', middle: 'F.' } });
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).to.exist;
      expect(error).to.have.property('message', "'name.last' is required");
    }
  });

  it('query', async () => {
    class Name {
      @cormo.Column(String)
      public first?: string;

      @cormo.Column(String)
      public last?: string;
    }
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name?: Name;
    }
    await User.create({ name: { first: 'John', last: 'Doe' } });
    await User.create({ name: { first: 'Bill', last: 'Smith' } });
    await User.create({ name: { first: 'Daniel', last: 'Smith' } });
    const users = await User.where({ 'name.last': 'Smith' });
    expect(users).to.have.length(2);
    users.sort((a, b) => (a.name!.first! < b.name!.first! ? -1 : 1));
    expect(users[0]).to.have.keys('id', 'name');
    expect(users[0].name).to.eql({ first: 'Bill', last: 'Smith' });
    expect(users[1]).to.have.keys('id', 'name');
    expect(users[1].name).to.eql({ first: 'Daniel', last: 'Smith' });
  });

  it('update', async () => {
    class Name {
      @cormo.Column(String)
      public first?: string;

      @cormo.Column(String)
      public last?: string;
    }
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name?: Name;
    }
    const user = await User.create({ name: { first: 'John', last: 'Doe' } });
    const count = await User.find(user.id).update({ name: { first: 'Bill' } });
    expect(count).to.equal(1);
    const record = await User.find(user.id);
    expect(record).to.have.keys('id', 'name');
    expect(record.name).to.eql({ first: 'Bill', last: 'Doe' });
  });

  it('constraint on update', async () => {
    class Name {
      @cormo.Column({ type: String, required: true })
      public first!: string;

      @cormo.Column({ type: String, required: true })
      public last!: string;

      @cormo.Column(String)
      public middle?: string;
    }
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name!: Name;
    }
    const user = await User.create({ name: { first: 'John', middle: 'F.', last: 'Doe' } });
    try {
      await User.find(user.id).update({ name: { last: null } });
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).to.exist;
      expect(error).to.have.property('message', "'name.last' is required");
    }
  });

  it('keys on empty', async () => {
    class Name {
      @cormo.Column(String)
      public first?: string;

      @cormo.Column(String)
      public last?: string;
    }
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name?: Name;

      @cormo.Column(Number)
      public age?: number;
    }
    const user1 = await User.create({ name: { first: 'John', last: 'Doe' }, age: 20 });
    expect(user1).to.have.keys('id', 'name', 'age');
    const user2 = await User.create({ age: 20 });
    expect(user2).to.have.keys('id', 'name', 'age');
    expect(user2.name).to.null;
  });

  it('replace object', async () => {
    class Name {
      @cormo.Column(String)
      public first?: string;

      @cormo.Column(String)
      public last?: string;
    }
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name?: Name;
    }
    const user = await User.create({ name: { first: 'John', last: 'Doe' } });
    user.name = { first: 'Bill' };
    expect(user.name.first).to.equal('Bill');
    await user.save();
    const record = await User.find(user.id);
    expect(record).to.have.keys('id', 'name');
    expect(record.name).to.eql({ first: 'Bill', last: null });
  });

  it('get & set', () => {
    class Name {
      @cormo.Column(String)
      public first?: string;

      @cormo.Column(String)
      public last?: string;
    }
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name?: Name;
    }
    const user = new User({ name: { first: 'John', last: 'Doe' } });
    expect(user.get('name.first')).to.equal('John');
    expect(user.get('name.last')).to.equal('Doe');
    user.set('name.first', 'Bill');
    expect(user.get('name.first')).to.equal('Bill');
    expect(user.get('name.last')).to.equal('Doe');
    user.set('name', { first: 'John' });
    expect(user.get('name.first')).to.equal('John');
    expect(user.get('name.last')).to.not.exist;
  });

  it('select sub', async () => {
    class Name {
      @cormo.Column(String)
      public first?: string;

      @cormo.Column(String)
      public last?: string;
    }
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name?: Name;
    }
    await User.create({ name: { first: 'John', last: 'Doe' } });
    const users = await User.select('name.first');
    expect(users).to.have.length(1);
    expect(users[0]).to.have.keys('id', 'name');
    expect(users[0].name).to.eql({ first: 'John' });
  });

  it('select super', async () => {
    class Name {
      @cormo.Column(String)
      public first?: string;

      @cormo.Column(String)
      public last?: string;
    }
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name?: Name;
    }
    await User.create({ name: { first: 'John', last: 'Doe' } });
    const users = await User.select('name');
    expect(users).to.have.length(1);
    expect(users[0]).to.have.keys('id', 'name');
    expect(users[0].name).to.eql({ first: 'John', last: 'Doe' });
  });

  it('update super null', async () => {
    class Name {
      @cormo.Column(String)
      public first?: string;

      @cormo.Column(String)
      public last?: string;
    }
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name?: Name;
    }
    const user = await User.create({ name: { first: 'John', last: 'Doe' } });
    const count = await User.find(user.id).update({ name: null });
    expect(count).to.equal(1);
    const record = await User.find(user.id);
    expect(record).to.have.keys('id', 'name');
    expect(record.name).to.be.null;
  });

  it('lean option', async () => {
    class Name {
      @cormo.Column(String)
      public first?: string;

      @cormo.Column(String)
      public last?: string;
    }
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name?: Name;
    }
    await User.create({ name: { first: 'John', last: 'Doe' } });
    const users = await User.select('name').lean();
    expect(users).to.have.length(1);
    expect(users[0]).to.have.keys('id', 'name');
    expect(users[0].name).to.eql({ first: 'John', last: 'Doe' });
  });

  it('select for null fields', async () => {
    class Name {
      @cormo.Column(String)
      public first?: string;

      @cormo.Column(String)
      public last?: string;
    }
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name?: Name;
    }
    await User.create({});
    // select sub
    const users1 = await User.select('name.first');
    expect(users1).to.have.length(1);
    expect(users1[0]).to.have.keys('id', 'name');
    expect(users1[0].name).to.eql({ first: null });
    // select super
    const users2 = await User.select('name');
    expect(users2).to.have.length(1);
    expect(users2[0]).to.have.keys('id', 'name');
    expect(users2[0].name).to.be.null;
    // select sub with lean
    const users3 = await User.select('name.first').lean();
    expect(users3).to.have.length(1);
    expect(users3[0]).to.have.keys('id', 'name');
    expect(users3[0].name).to.eql({ first: null });
    // select super with lean
    const users4 = await User.select('name').lean();
    expect(users4).to.have.length(1);
    expect(users4[0]).to.have.keys('id', 'name');
    expect(users4[0].name).to.be.null;
  });

  it('order', async () => {
    class Name {
      @cormo.Column(String)
      public first?: string;

      @cormo.Column(String)
      public last?: string;
    }
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name?: Name;
    }
    await User.create({ name: { first: 'John', last: 'Doe' } });
    await User.create({ name: { first: 'Bill', last: 'Smith' } });
    await User.create({ name: { first: 'Alice', last: 'Jackson' } });
    await User.create({ name: { first: 'Gina', last: 'Baker' } });
    await User.create({ name: { first: 'Daniel', last: 'Smith' } });
    const users = await User.where().order('name.first');
    expect(users).to.have.length(5);
    expect(users[0]).to.have.keys('id', 'name');
    expect(users[0].name).to.eql({ first: 'Alice', last: 'Jackson' });
    expect(users[1]).to.have.keys('id', 'name');
    expect(users[1].name).to.eql({ first: 'Bill', last: 'Smith' });
  });

  it('define index using nested column', async () => {
    class Name {
      @cormo.Column(String)
      public first?: string;

      @cormo.Column(String)
      public last?: string;
    }
    @cormo.Model()
    @cormo.Index({ 'name.last': 1 })
    @cormo.Index({ 'name.first': 1, 'age': 1 })
    class User extends cormo.BaseModel {
      @cormo.ObjectColumn(Name)
      public name?: Name;

      @cormo.Column(Number)
      public age?: number;
    }
    await User.create({ name: { first: 'John', last: 'Doe' }, age: 20 });
  });

  it('deep nested', async () => {
    class Name {
      @cormo.Column(String)
      public first?: string;

      @cormo.Column(String)
      public last?: string;
    }
    class User {
      @cormo.ObjectColumn(Name)
      public name?: Name;

      @cormo.Column(String)
      public tel?: string;
    }
    @cormo.Model()
    class Order extends cormo.BaseModel {
      @cormo.ObjectColumn(User)
      public orderer?: User;

      @cormo.ObjectColumn(User)
      public receiver?: User;
    }
    const order = await Order.create({
      orderer: { name: { first: 'John', last: 'Doe' }, tel: '1111-1111' },
      receiver: { name: { first: 'Bill', last: 'Smith' }, tel: '2222-2222' },
    });
    expect(order).to.have.keys('id', 'orderer', 'receiver');
    expect(order.orderer!.name).to.eql({ first: 'John', last: 'Doe' });
    const record = await Order.find(order.id);
    expect(record).to.have.keys('id', 'orderer', 'receiver');
    expect(record.orderer!.name).to.eql({ first: 'John', last: 'Doe' });
  });
}
