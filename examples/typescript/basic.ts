import * as cormo from '../..';

const connection = new cormo.Connection('mysql', {database: 'test'});

class User extends cormo.Model {
  static initialize() {
    this.column('name', {type:String, required:true});
    this.column('age', Number);
  }

  name: string;
  age: number;
}

async function run() {
  const user = await User.create<User>({name: 'croquis', age: 3})
  console.log(user.name);

  const users = await User.where<User[]>();
  for (const user of users) {
    console.log(`name - ${user.name}, age - ${user.age}`);
  }
}

run().then(() => {
  console.log("Done");
  process.exit(0);
});
