import * as util from 'util';
import * as cormo from '../../src/index.js';

export const connection = new cormo.MySQLConnection({
  implicit_apply_schemas: true,
  database: 'cormo_test',
  logger: 'color-console',
  password: 'cormo_test',
  port: 21860,
  replication: {
    read_replicas: [
      {
        password: 'cormo_test',
        port: 21860,
        user: 'cormo_test',
        pool_max_idle: 2,
        pool_idle_timeout: 5000,
      },
    ],
  },
  user: 'cormo_test',
  connection_retry_count: 2,
  pool_max_idle: 2,
  pool_idle_timeout: 5000,
});

class Name {
  @cormo.Column({ type: String, required: true, description: 'First name' })
  public first!: string;

  @cormo.Column({ type: String, required: true, description: 'Last name' })
  public last!: string;

  public toString() {
    return `${this.first} ${this.last}`;
  }

  public [util.inspect.custom]?() {
    return this.toString();
  }
}

@cormo.Model({ connection, description: 'User model' })
@cormo.Index({ 'name.first': 1, 'age': 1 })
export class User extends cormo.BaseModel {
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
  const user = new User({ name: { first: 'Alice', last: 'Jackson' } });
  await user.save();
  console.log(user.name);
}

async function build() {
  const user = User.build({ name: { first: 'Gina', last: 'Baker' } });
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
  console.log(`name of age 5 is #${user!.id} ${user!.name}`);
}

async function count() {
  const c = await User.count();
  console.log(c);
}

async function transaction() {
  console.log('count before transaction =', await User.count());
  try {
    await connection.transaction<void, User>({ models: [User] }, async (TxUser) => {
      const user = await TxUser.create({ name: { first: 'Daniel', last: 'Smith' }, age: 8 });
      console.log(user.name, user.age);
      console.log(await TxUser.count());
      throw new Error('abort');
    });
  } catch {
    //
  }
  console.log('count after transaction =', await User.count());
}

async function run() {
  await connection.applySchemas({ verbose: true });

  await create1();
  await create2();
  await save();
  await build();
  await getAll();
  await query();
  await count();
  await transaction();

  await User.drop();
}

run()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.log((error.cause || error).toString());
    process.exit(0);
  });
