// tslint:disable:max-classes-per-file

import * as util from 'util';
import * as cormo from '../../src';

const connection = new cormo.Connection('mysql', {
  database: 'cormo_test',
  password: 'cormo_test',
  port: 21860,
  user: 'cormo_test',
});

class Name {
  @cormo.Column({ type: String, required: true })
  public first!: string;

  @cormo.Column({ type: String, required: true })
  public last!: string;

  public toString() {
    return `${this.first} ${this.last}`;
  }

  public [util.inspect.custom]() {
    return this.toString();
  }
}

@cormo.Model({ connection })
@cormo.Index({ 'name.first': 1, 'age': 1 })
class User extends cormo.BaseModel {
  public id!: number;

  @cormo.ObjectColumn(Name)
  public name!: Name;

  @cormo.Column(Number)
  public age?: number;
}

async function create1() {
  const user = await User.create({ name: { first: 'John', last: 'Doe' } });
  console.log(user.name);
}

async function create2() {
  const user = await User.create({ name: { first: 'Bill', last: 'Smith' }, age: 5 });
  console.log(user.name);
}

async function save() {
  const user = await new User({ name: { first: 'Alice', last: 'Jackson' } });
  user.save();
  console.log(user.name);
}

async function build() {
  const user = await User.build({ name: { first: 'Gina', last: 'Baker' } });
  await user.save();
  console.log(user.name);
}

async function getAll() {
  const users = await User.where();
  for (const user of users) {
    console.log(`name - ${user.name}, age - ${user.age}`);
  }
}

async function query() {
  const user = await User.where({ age: 5 }).select(['id', 'name']).one();
  console.log(`name of age 5 is #${user.id} ${user.name}`);
}

async function count() {
  const c = await User.count();
  console.log(c);
}

async function run() {
  await create1();
  await create2();
  await save();
  await build();
  await getAll();
  await query();
  await count();
  await User.drop();
}

run().then(() => {
  console.log('Done');
  process.exit(0);
}).catch((error) => {
  console.log((error.cause || error).toString());
  process.exit(0);
});
