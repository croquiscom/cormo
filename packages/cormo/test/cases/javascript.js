/* global it */

const { expect } = require('chai');
const _g = require('../support/common').default;

async function _createUsers(User, data) {
  if (!data) {
    data = [
      { name: 'John Doe', age: 27 },
      { name: 'Bill Smith', age: 45 },
      { name: 'Alice Jackson', age: 27 },
      { name: 'Gina Baker', age: 32 },
      { name: 'Daniel Smith', age: 53 },
    ];
  }
  data.sort(() => 0.5 - Math.random()); // random sort
  return await User.createBulk(data);
}

module.exports = () => {
  it('create one', () => {
    const user = new _g.connection.User();
    user.name = 'John Doe';
    user.age = 27;
    expect(user).to.have.property('name', 'John Doe');
    expect(user).to.have.property('age', 27);
  });

  it('initialize in constructor', () => {
    const user = new _g.connection.User({ name: 'John Doe', age: 27 });
    expect(user).to.have.property('name', 'John Doe');
    expect(user).to.have.property('age', 27);
  });

  it('build method', () => {
    const user = _g.connection.User.build({ name: 'John Doe', age: 27 });
    expect(user).to.have.property('name', 'John Doe');
    expect(user).to.have.property('age', 27);
  });

  it('add a new record to the database', async () => {
    const user = new _g.connection.User({ name: 'John Doe', age: 27 });
    await user.save();
    expect(user).to.have.property('id');
  });

  it('create method', async () => {
    const user = await _g.connection.User.create({ name: 'John Doe', age: 27 });
    expect(user).to.have.property('id');
  });

  it('simple where', async () => {
    await _createUsers(_g.connection.User);
    const users = await _g.connection.User.where({ age: 27 });
    expect(users).to.have.length(2);
    users.sort((a, b) => (a.name < b.name ? -1 : 1));
    expect(users[0]).to.have.property('name', 'Alice Jackson');
    expect(users[0]).to.have.property('age', 27);
    expect(users[1]).to.have.property('name', 'John Doe');
    expect(users[1]).to.have.property('age', 27);
  });

  it('where chain', async () => {
    await _createUsers(_g.connection.User);
    const users = await _g.connection.User.where({ age: 27 }).where({ name: 'Alice Jackson' });
    expect(users).to.have.length(1);
    expect(users[0]).to.have.property('name', 'Alice Jackson');
    expect(users[0]).to.have.property('age', 27);
  });

  it('$or', async () => {
    await _createUsers(_g.connection.User);
    const users = await _g.connection.User.where({ $or: [{ age: 32 }, { name: 'John Doe' }] });
    expect(users).to.have.length(2);
    users.sort(function (a, b) {
      return a.name < b.name ? -1 : 1;
    });
    expect(users[0]).to.have.property('name', 'Gina Baker');
    expect(users[0]).to.have.property('age', 32);
    expect(users[1]).to.have.property('name', 'John Doe');
    expect(users[1]).to.have.property('age', 27);
  });
};
