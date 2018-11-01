import * as cormo from '../../src';

const connection = new cormo.Connection('mysql', {
  database: 'cormo_test',
  password: 'cormo_test',
  port: 21860,
  user: 'cormo_test',
});

@cormo.Model({ connection })
@cormo.Index({ name: 1, age: 1 })
class User extends cormo.BaseModel {
  public id!: number;

  @cormo.Column({ type: String, required: true })
  public name!: string;

  @cormo.Column(Number)
  public age?: number;
}

async function create1() {
  const user = await User.create({ name: 'croquis' });
  console.log(user.name);
}

async function create2() {
  const user = await User.create({ name: 'foobar', age: 5 });
  console.log(user.name);
}

async function save() {
  const user = await new User({ name: 'cormo' });
  user.save();
  console.log(user.name);
}

async function build() {
  const user = await User.build({ name: 'rinore' });
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
  const foobar = await User.where({ age: 5 }).select(['id', 'name']).one();
  console.log(`name of age 5 is #${foobar.id} ${foobar.name}`);
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
});
