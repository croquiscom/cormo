// using full ES6 features
// need Babel to run

import {Connection, Model} from "..";
import co from "co";

const connection = new Connection('mysql', {database: 'test'});

class User extends Model {
};

User.column('name', {type:String, required:true});
User.column('age', Number);

co(function* () {
  const user = yield User.create({name: 'croquis', age: 3});
  console.log(user);

  const users = yield User.where();
  console.log(users);
}).then(() => {
  console.log("Done");
  process.exit(0);
});
