import { expect } from 'chai';
import * as cormo from '../..';

export class UserRef extends cormo.BaseModel {
  public name?: string;
  public age?: number;
}

export type UserRefVO = cormo.ModelValueObject<UserRef>;

export class PostRef extends cormo.BaseModel {
  public title?: string | null;
  public body?: string | null;
  public readers?: number[];

  public user_id?: number;
}

function _compareUser(user: UserRef, expected: UserRefVO) {
  expect(user).to.have.keys('id', 'name', 'age');
  expect(user.name).to.equal(expected.name);
  return expect(user.age).to.equal(expected.age);
}

export default function(models: {
  User: typeof UserRef;
  Post: typeof PostRef;
  connection: cormo.Connection | null;
}) {
  it('create simple', async () => {
    const count = await models.User.count();
    expect(count).to.equal(0);
    await models.connection!.manipulate([
      { create_user: { name: 'John Doe', age: 27 } },
    ]);
    const users = await models.connection!.User.where();
    expect(users).to.have.length(1);
    expect(users[0]).to.have.keys('id', 'name', 'age');
    expect(users[0].name).to.equal('John Doe');
    expect(users[0].age).to.equal(27);
  });

  it('invalid model', async () => {
    try {
      await models.connection!.manipulate([
        { create_account: { name: 'John Doe', age: 27 } },
      ]);
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error).to.exist;
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.equal('model Account does not exist');
    }
  });

  it('create multiple', async () => {
    await models.connection!.manipulate([
      { create_user: { name: 'John Doe', age: 27 } },
      { create_user: { name: 'Bill Smith', age: 45 } },
      { create_user: { name: 'Alice Jackson', age: 27 } },
    ]);
    const count = await models.connection!.User.count();
    expect(count).to.equal(3);
  });

  it('delete all', async () => {
    await models.connection!.manipulate([
      { create_user: { name: 'John Doe', age: 27 } },
      { create_user: { name: 'Bill Smith', age: 45 } },
      { create_user: { name: 'Alice Jackson', age: 27 } },
    ]);
    await models.connection!.manipulate(['delete_user']);
    const count = await models.User.count();
    expect(count).to.equal(0);
  });

  it('delete some', async () => {
    await models.connection!.manipulate([
      { create_user: { name: 'John Doe', age: 27 } },
      { create_user: { name: 'Bill Smith', age: 45 } },
      { create_user: { name: 'Alice Jackson', age: 27 } },
    ]);
    await models.connection!.manipulate([
      { delete_user: { age: 27 } },
    ]);
    const count = await models.User.count();
    expect(count).to.equal(1);
    const users = await models.User.where();
    expect(users).to.have.length(1);
    expect(users[0]).to.have.keys('id', 'name', 'age');
    expect(users[0].name).to.equal('Bill Smith');
    expect(users[0].age).to.equal(45);
  });

  it('build association', async () => {
    await models.connection!.manipulate([
      { create_user: { id: 'user1', name: 'John Doe', age: 27 } },
      { create_post: { title: 'first post', body: 'This is the 1st post.', user_id: 'user1' } },
    ]);
    const users = await models.User.where();
    const posts = await models.Post.where();
    expect(users).to.have.length(1);
    expect(posts).to.have.length(1);
    expect(posts[0].user_id).to.equal(users[0].id);
  });

  it('build association by real id', async () => {
    const id_to_record_map = await models.connection!.manipulate([
      { create_user: { id: 'user1', name: 'John Doe', age: 27 } },
    ]);
    await models.connection!.manipulate([
      { create_post: { title: 'first post', body: 'This is the 1st post.', user_id: id_to_record_map.user1.id } },
    ]);
    const users = await models.User.where();
    const posts = await models.Post.where();
    expect(users).to.have.length(1);
    expect(posts).to.have.length(1);
    expect(posts[0].user_id).to.equal(users[0].id);
  });

  it('id is not shared between manipulates', async () => {
    await models.connection!.manipulate([
      { create_user: { id: 'user1', name: 'John Doe', age: 27 } },
    ]);
    try {
      await models.connection!.manipulate([
        { create_post: { title: 'first post', body: 'This is the 1st post.', user_id: 'user1' } },
      ]);
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error).to.exist;
      expect(error).to.be.an.instanceof(Error);
    }
  });

  it('deleteAll', async () => {
    await models.connection!.manipulate([
      { create_user: { name: 'John Doe', age: 27 } },
      { create_post: { title: 'first post', body: 'This is the 1st post.' } },
    ]);
    let count = await models.User.count();
    expect(count).to.equal(1);
    count = (await models.Post.count());
    expect(count).to.equal(1);
    await models.connection!.manipulate(['deleteAll']);
    count = (await models.User.count());
    expect(count).to.equal(0);
    count = (await models.Post.count());
    expect(count).to.equal(0);
  });

  context('delete all with constraint', () => {
    let A: typeof cormo.BaseModel;
    let B: typeof cormo.BaseModel;
    let C: typeof cormo.BaseModel;
    let D: typeof cormo.BaseModel;
    before(() => {
      A = models.connection!.model('A', { value: Number });
      B = models.connection!.model('B', { value: Number });
      C = models.connection!.model('C', { value: Number });
      D = models.connection!.model('D', { value: Number });
      B.belongsTo(A, { required: true });
      A.hasMany(B, { integrity: 'restrict' });
      B.belongsTo(C, { required: true });
      C.hasMany(B, { integrity: 'restrict' });
      D.belongsTo(C, { required: true });
      C.hasMany(D, { integrity: 'restrict' });
    });

    after(async () => {
      await B.drop();
      await D.drop();
      await C.drop();
      await A.drop();
    });

    it('run', async () => {
      await models.connection!.manipulate([
        { create_a: { id: 'a1', value: 1 } },
        { create_c: { id: 'c1', value: 3 } },
        { create_b: { id: 'b1', value: 2, a_id: 'a1', c_id: 'c1' } },
        { create_d: { value: 4, c_id: 'c1' } },
      ]);
      await models.connection!.manipulate(['deleteAll']);
      expect(await A.count()).to.equal(0);
      expect(await B.count()).to.equal(0);
      expect(await C.count()).to.equal(0);
      expect(await D.count()).to.equal(0);
    });
  });

  it('find record', async () => {
    await models.connection!.manipulate([
      { create_user: { name: 'John Doe', age: 27 } },
      { create_user: { name: 'Bill Smith', age: 45 } },
      { create_user: { name: 'Alice Jackson', age: 27 } },
    ]);
    const id_to_record_map = await models.connection!.manipulate([
      { find_users: { id: 'users', age: 27 } },
    ]);
    const users = id_to_record_map.users;
    expect(users).to.be.an.instanceof(Array);
    expect(users).to.have.length(2);
    users.sort((a: any, b: any) => {
      if (a.name < b.name) {
        return -1;
      } else {
        return 1;
      }
    });
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
  });

  it('build array column', async () => {
    const id_to_record_map = await models.connection!.manipulate([
      { create_user: { id: 'user1', name: 'John Doe', age: 27 } },
      { create_user: { id: 'user2', name: 'Bill Smith', age: 45 } },
      { create_user: { id: 'user3', name: 'Alice Jackson', age: 27 } },
      { create_post: { title: 'first post', body: 'This is the 1st post.', user_id: 'user1', readers: ['user2', 'user3'] } },
    ]);
    const users = [id_to_record_map.user1, id_to_record_map.user2, id_to_record_map.user3];
    const posts = await models.Post.where();
    expect(users).to.have.length(3);
    expect(posts).to.have.length(1);
    expect(posts[0].user_id).to.equal(users[0].id);
    expect(posts[0].readers).to.eql([users[1].id, users[2].id]);
  });
}
