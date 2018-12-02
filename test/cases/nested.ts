// tslint:disable:max-classes-per-file no-unused-expression

import { expect } from 'chai';
import * as cormo from '../..';

export default function(db: any, db_config: any) {
  let connection!: cormo.Connection;

  beforeEach(() => {
    connection = new cormo.Connection(db, db_config);
  });

  afterEach(async () => {
    await connection!.dropAllModels();
    connection!.close();
  });

  it('define a model, create an instance and fetch it', async () => {
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
    expect(user.name).to.have.keys('first', 'last');
    expect(user.name!.first).to.eql('John');
    expect(user.name!.last).to.eql('Doe');
    const record = await User.find(user.id);
    expect(record).to.have.keys('id', 'name');
    expect(record.name).to.have.keys('first', 'last');
    expect(record.name!.first).to.eql('John');
    expect(record.name!.last).to.eql('Doe');
  });

  it('get a record whose super column is null', async () => {
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
    expect(user.name).to.have.keys('first', 'last');
    expect(user.name.first).to.eql('John');
    expect(user.name.last).to.eql('Doe');
    const record = await (User as any).find(user.id);
    expect(record).to.have.keys('id', 'name');
    expect(record.name).to.have.keys('first', 'last');
    expect(record.name.first).to.eql('John');
    expect(record.name.last).to.eql('Doe');
  });

  it('constraint', async () => {
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.Column({
        first: { type: String, required: true },
        last: { type: String, required: true },
        middle: String,
      })
      public name!: {
        first: string;
        last: string;
        middle?: string;
      };
    }
    const user1 = await User.create({ name: { first: 'John', middle: 'F.', last: 'Doe' } });
    const record1 = await User.find(user1.id);
    expect(record1).to.have.keys('id', 'name');
    expect(record1.name).to.have.keys('first', 'middle', 'last');
    expect(record1.name.first).to.eql('John');
    expect(record1.name.middle).to.eql('F.');
    expect(record1.name.last).to.eql('Doe');
    // missing non-required field
    const user2 = await User.create({ name: { first: 'John', last: 'Doe' } });
    const record2 = await User.find(user2.id);
    expect(record2).to.have.keys('id', 'name');
    expect(record2.name).to.have.keys('first', 'middle', 'last');
    expect(record2.name.first).to.eql('John');
    expect(record2.name.middle).to.null;
    expect(record2.name.last).to.eql('Doe');
    try {
      // missing required field
      await (User as any).create({ name: { first: 'John', middle: 'F.' } });
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error).to.exist;
      expect(error).to.have.property('message', "'name.last' is required");
    }
  });

  it('query', async () => {
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
    await User.create({ name: { first: 'John', last: 'Doe' } });
    await User.create({ name: { first: 'Bill', last: 'Smith' } });
    await User.create({ name: { first: 'Daniel', last: 'Smith' } });
    const users = await User.where({ 'name.last': 'Smith' });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name!.first! < b.name!.first! ? -1 : 1);
    expect(users[0]).to.have.keys('id', 'name');
    expect(users[0].name).to.have.keys('first', 'last');
    expect(users[0].name!.first).to.eql('Bill');
    expect(users[0].name!.last).to.eql('Smith');
    expect(users[1]).to.have.keys('id', 'name');
    expect(users[1].name).to.have.keys('first', 'last');
    expect(users[1].name!.first).to.eql('Daniel');
    expect(users[1].name!.last).to.eql('Smith');
  });

  it('update', async () => {
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
    const count = await User.find(user.id).update({ name: { first: 'Bill' } });
    expect(count).to.equal(1);
    const record = (await User.find(user.id));
    expect(record).to.have.keys('id', 'name');
    expect(record.name).to.have.keys('first', 'last');
    expect(record.name!.first).to.eql('Bill');
    expect(record.name!.last).to.eql('Doe');
  });

  it('constraint on update', async () => {
    @cormo.Model()
    class User extends cormo.BaseModel {
      @cormo.Column({
        first: { type: String, required: true },
        last: { type: String, required: true },
        middle: String,
      })
      public name!: {
        first: string;
        last: string;
        middle?: string;
      };
    }
    const user = await User.create({ name: { first: 'John', middle: 'F.', last: 'Doe' } });
    try {
      await User.find(user.id).update({ name: { last: null } });
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error).to.exist;
      expect(error).to.have.property('message', "'name.last' is required");
    }
  });

  it('keys on empty', async () => {
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
    user.name = { first: 'Bill' };
    expect(user.name.first).to.equal('Bill');
    await user.save();
    const record = await User.find(user.id);
    expect(record).to.have.keys('id', 'name');
    expect(record.name).to.have.keys('first', 'last');
    expect(record.name!.first).to.eql('Bill');
    expect(record.name!.last).to.be.null;
  });

  it('get & set', () => {
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
    await User.create({ name: { first: 'John', last: 'Doe' } });
    const users = await User.select('name.first');
    expect(users).to.have.length(1);
    expect(users[0]).to.have.keys('id', 'name');
    expect(users[0].name).to.have.keys('first');
    expect(users[0].name!.first).to.eql('John');
  });

  it('select super', async () => {
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
    await User.create({ name: { first: 'John', last: 'Doe' } });
    const users = await User.select('name');
    expect(users).to.have.length(1);
    expect(users[0]).to.have.keys('id', 'name');
    expect(users[0].name).to.have.keys('first', 'last');
    expect(users[0].name!.first).to.eql('John');
    expect(users[0].name!.last).to.eql('Doe');
  });

  it('update super null', async () => {
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
    const count = await User.find(user.id).update({ name: null });
    expect(count).to.equal(1);
    const record = await User.find(user.id);
    expect(record).to.have.keys('id', 'name');
    expect(record.name).to.be.null;
  });

  it('lean option', async () => {
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
    await User.create({ name: { first: 'John', last: 'Doe' } });
    const users = await User.select('name').lean();
    expect(users).to.have.length(1);
    expect(users[0]).to.have.keys('id', 'name');
    expect(users[0].name).to.have.keys('first', 'last');
    expect(users[0].name!.first).to.eql('John');
    expect(users[0].name!.last).to.eql('Doe');
  });

  it('select for null fields', async () => {
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
    await User.create({ name: { first: 'John', last: 'Doe' } });
    await User.create({ name: { first: 'Bill', last: 'Smith' } });
    await User.create({ name: { first: 'Alice', last: 'Jackson' } });
    await User.create({ name: { first: 'Gina', last: 'Baker' } });
    await User.create({ name: { first: 'Daniel', last: 'Smith' } });
    const users = await User.where().order('name.first');
    expect(users).to.have.length(5);
    expect(users[0]).to.have.keys('id', 'name');
    expect(users[0].name).to.have.keys('first', 'last');
    expect(users[0].name!.first).to.eql('Alice');
    expect(users[0].name!.last).to.eql('Jackson');
    expect(users[1]).to.have.keys('id', 'name');
    expect(users[1].name).to.have.keys('first', 'last');
    expect(users[1].name!.first).to.eql('Bill');
    expect(users[1].name!.last).to.eql('Smith');
  });

  it('define index using nested column', async () => {
    @cormo.Model()
    @cormo.Index({ 'name.last': 1 })
    @cormo.Index({ 'name.first': 1, 'age': 1 })
    class User extends cormo.BaseModel {
      @cormo.Column({
        first: String,
        last: String,
      })
      public name?: {
        first?: string;
        last?: string;
      };

      @cormo.Column(Number)
      public age?: number;
    }
    await User.create({ name: { first: 'John', last: 'Doe' }, age: 20 });
  });
}
