// using full ES6 features
// need Babel to run

// eslint-disable-next-line import/no-unresolved
import co from 'co';
import { Connection, BaseModel } from '../..';

const connection = new Connection('mysql', {
  database: 'cormo_test',
  password: 'cormo_test',
  port: 21860,
  user: 'cormo_test',
});

class User extends BaseModel {
  static initialize() {
    this.column('name', { type: String, required: true });
    this.column('age', Number);
  }
}

co(function* () {
  const user = yield User.create({ name: 'croquis', age: 3 });
  console.log(user);

  const users = yield User.where();
  console.log(users);
}).then(() => {
  console.log('Done');
  process.exit(0);
});
