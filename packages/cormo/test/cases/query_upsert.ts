import { expect } from 'chai';
import * as sinon from 'sinon';
import * as cormo from '../..';

export class UserRef extends cormo.BaseModel {
  public name?: string | null;
  public age?: number | null;
  public count?: number | null;
  public date_created?: Date | null;
}

export type UserRefVO = cormo.ModelValueObject<UserRef>;

const fake_date = new Date(2021, 1, 5, 10, 23).getTime();

function _compareUserUnique(user: UserRef, expected: UserRefVO) {
  expect(user).to.have.keys('id', 'name', 'age', 'count', 'date_created');
  expect(user.name).to.equal(expected.name);
  expect(user.age).to.equal(expected.age);
  expect(user.count).to.equal(expected.count);
  expect(user.date_created?.getTime()).to.equal(fake_date);
}

async function _createUserUniques(User: typeof UserRef, data?: UserRefVO[]) {
  if (!data) {
    data = [
      { name: 'Alice Jackson', age: 27 },
      { name: 'Bill Smith', age: 45 },
    ];
  }
  return await User.createBulk(data);
}

export default function(models: {
  connection: cormo.Connection | null;
}) {
  let sandbox: sinon.SinonSandbox;
  let User: typeof UserRef;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.useFakeTimers(fake_date);

    @cormo.Model()
    class UserUnique extends cormo.BaseModel {
      @cormo.Column({ type: String, unique: true })
      public name?: string;

      @cormo.Column(Number)
      public age?: number;

      @cormo.Column({ type: Number, default_value: 5 })
      public count?: number;

      @cormo.Column({ type: Date, default_value: Date.now })
      public date_created?: Date;
    }
    User = UserUnique;
  });

  afterEach(async () => {
    await User.drop();
    sandbox.restore();
  });

  it('insert new', async () => {
    await _createUserUniques(User);
    await User.where({ name: 'Elsa Wood' }).upsert({ age: 10 });
    const users = await User.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users).to.have.length(3);
    _compareUserUnique(users[0], { name: 'Alice Jackson', age: 27, count: 5 });
    _compareUserUnique(users[1], { name: 'Bill Smith', age: 45, count: 5 });
    _compareUserUnique(users[2], { name: 'Elsa Wood', age: 10, count: 5 });
  });

  it('update exist', async () => {
    await _createUserUniques(User);
    await User.where({ name: 'Bill Smith' }).upsert({ age: 10 });
    const users = await User.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users).to.have.length(2);
    _compareUserUnique(users[0], { name: 'Alice Jackson', age: 27, count: 5 });
    _compareUserUnique(users[1], { name: 'Bill Smith', age: 10, count: 5 });
  });

  it('default value ignored on update', async () => {
    await _createUserUniques(User);
    await User.where({ name: 'Bill Smith' }).update({ age: 10, count: 8 });
    await User.where({ name: 'Bill Smith' }).upsert({ age: 10 });
    const users = await User.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users).to.have.length(2);
    _compareUserUnique(users[0], { name: 'Alice Jackson', age: 27, count: 5 });
    _compareUserUnique(users[1], { name: 'Bill Smith', age: 10, count: 8 });
  });

  it('$inc for new', async () => {
    await _createUserUniques(User);
    await User.where({ name: 'Elsa Wood' }).upsert({ age: { $inc: 4 } });
    const users = await User.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users).to.have.length(3);
    _compareUserUnique(users[0], { name: 'Alice Jackson', age: 27, count: 5 });
    _compareUserUnique(users[1], { name: 'Bill Smith', age: 45, count: 5 });
    _compareUserUnique(users[2], { name: 'Elsa Wood', age: 4, count: 5 });
  });

  it('$inc for exist', async () => {
    await _createUserUniques(User);
    await User.where({ name: 'Bill Smith' }).upsert({ age: { $inc: 4 } });
    const users = await User.where();
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    expect(users).to.have.length(2);
    _compareUserUnique(users[0], { name: 'Alice Jackson', age: 27, count: 5 });
    _compareUserUnique(users[1], { name: 'Bill Smith', age: 49, count: 5 });
  });

  it('set field only on update', async () => {
    await User.where({ name: 'Elsa Wood' }).upsert({ age: 10, count: { $inc: 1 } }, { ignore_on_update: ['age'] });
    const users1 = await User.where();
    expect(users1).to.have.length(1);
    _compareUserUnique(users1[0], { name: 'Elsa Wood', age: 10, count: 1 });

    await User.where({ name: 'Elsa Wood' }).upsert({ age: 30, count: { $inc: 1 } }, { ignore_on_update: ['age'] });
    const users2 = await User.where();
    expect(users2).to.have.length(1);
    _compareUserUnique(users2[0], { name: 'Elsa Wood', age: 10, count: 2 });
  });

  it('set field only on update with $inc', async () => {
    await User.where({ name: 'Elsa Wood' }).upsert({ age: 10, count: { $inc: 1 } }, { ignore_on_update: ['count'] });
    const users1 = await User.where();
    expect(users1).to.have.length(1);
    _compareUserUnique(users1[0], { name: 'Elsa Wood', age: 10, count: 1 });

    await User.where({ name: 'Elsa Wood' }).upsert({ age: 30, count: { $inc: 1 } }, { ignore_on_update: ['count'] });
    const users2 = await User.where();
    expect(users2).to.have.length(1);
    _compareUserUnique(users2[0], { name: 'Elsa Wood', age: 30, count: 1 });
  });

  it('upsert with no update field', async () => {
    await User.where({ name: 'Elsa Wood' }).upsert({ age: 10 }, { ignore_on_update: ['age'] });
    const users1 = await User.where();
    expect(users1).to.have.length(1);
    _compareUserUnique(users1[0], { name: 'Elsa Wood', age: 10, count: 5 });

    await User.where({ name: 'Elsa Wood' }).upsert({ age: 30 }, { ignore_on_update: ['age'] });
    const users2 = await User.where();
    expect(users2).to.have.length(1);
    _compareUserUnique(users2[0], { name: 'Elsa Wood', age: 10, count: 5 });
  });
}
