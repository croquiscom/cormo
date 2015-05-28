/// <reference path="../../cormo.d.ts" />

declare var process;

import cormo = require("cormo");

var connection = new cormo.Connection('mysql', {database: 'test'});

class User extends cormo.Model {
  static initialize() {
    this.column('name', {type:String, required:true});
    this.column('age', Number);
  }
}

User.create({name: 'croquis', age: 3})
.then(function (user: User) {
  console.log(user);
}).then(function () {
  return User.where();
}).then(function (users: Array<User>) {
  console.log(users);
}).then(() => {
  console.log("Done");
  process.exit(0);
});
