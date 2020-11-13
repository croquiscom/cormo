const cormo = require('../..');

const connection = new cormo.Connection('mysql', {
  implicit_apply_schemas: true,
  database: 'cormo_test',
  logger: 'color-console',
  password: 'cormo_test',
  port: 21860,
  user: 'cormo_test',
  connection_retry_count: 2,
});

class User extends cormo.BaseModel {
  static initialize() {
    this.column('name', {
      first: { type: String, required: true },
      last: { type: String, required: true },
    });
    this.column('age', Number);
    this.index({ 'name.first': 1, 'age': 1 });
  }
}

async function run() {
  const user = await User.create({ name: { first: 'Bill', last: 'Smith' }, age: 5 });
  console.log(user);

  const users = await User.where();
  console.log(users);

  await User.drop();
}

run().then(() => {
  console.log('Done');
  process.exit(0);
}).catch((error) => {
  console.log((error.cause || error).toString());
  process.exit(0);
});
