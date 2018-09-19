import * as cormo from '../..';

const connection = new cormo.Connection('mysql', {
  database: 'cormo_test',
  password: 'cormo_test',
  user: 'cormo_test',
});

class User extends cormo.Model {
  public static initialize() {
    this.column('name', { type: String, required: true });
    this.column('age', Number);
  }

  public name?: string;
  public age?: number;
}

async function create1() {
  const user = await User.create({ name: 'croquis' });
  console.log(user.name);
}

async function create2() {
  await User.create({ name: 'foobar', age: 5 });
}

async function getAll() {
  const users = await User.where();
  for (const user of users) {
    console.log(`name - ${user.name}, age - ${user.age}`);
  }
}

async function query() {
  const foobar = await User.where({ age: 5 }).select('name').one() as { name: string };
  console.log(`name of age 5 is ${foobar.name}`);
}

async function run() {
  await create1();
  await create2();
  await getAll();
  await query();
  await User.drop();
}

run().then(() => {
  console.log('Done');
  process.exit(0);
});
