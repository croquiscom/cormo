import * as cormo from '../..';

const connection = new cormo.Connection('mysql', {database: 'test'});

class User extends cormo.Model {
  static initialize() {
    this.column('name', {type:String, required:true});
    this.column('age', Number);
  }

  name: string;
  age?: number;
}

async function run() {
  const user = await User.create({name: 'croquis'})
  console.log(user.name);

  await User.create({name: 'foobar', age: 5});

  const users = await User.where();
  for (const user of users) {
    console.log(`name - ${user.name}, age - ${user.age}`);
  }

  const foobar = await User.where({age: 5}).select('name').one() as {name: string};
  console.log(`name of age 5 is ${foobar.name}`);

  await User.drop();
}

run().then(() => {
  console.log("Done");
  process.exit(0);
});
