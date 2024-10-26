import { expect } from 'chai';
import * as cormo from '../..';

export class UserRef extends cormo.BaseModel {
  public name?: string;
  public age?: number;
}

export class PostRef extends cormo.BaseModel {
  public title?: string | null;
  public body?: string | null;
  public user_id?: number;
}

class _Archive extends cormo.BaseModel {
  public model!: string;
  public data?: any;
}

function _compareUser(archive: _Archive, expected: UserRef) {
  expect(archive.model).to.equal('User');
  const user = archive.data;
  expect(user).to.have.keys('id', 'name', 'age');
  expect(user.id).to.equal(expected.id);
  expect(user.name).to.equal(expected.name);
  expect(user.age).to.equal(expected.age);
}

function _comparePost(archive: _Archive, expected: PostRef) {
  expect(archive.model).to.equal('Post');
  const post = archive.data;
  expect(post).to.have.keys('id', 'title', 'body', 'user_id');
  expect(post.id).to.equal(expected.id);
  expect(post.title).to.equal(expected.title);
  expect(post.body).to.equal(expected.body);
  expect(post.user_id).to.equal(expected.user_id);
}

export default function (models: { User: typeof UserRef; Post: typeof PostRef; connection: cormo.Connection | null }) {
  it('basic', async () => {
    const id_to_record_map = await models.connection!.manipulate([
      { create_user: { id: 'user0', name: 'John Doe', age: 27 } },
      { create_user: { id: 'user1', name: 'Bill Smith', age: 45 } },
      { create_user: { id: 'user2', name: 'Alice Jackson', age: 27 } },
      { create_user: { id: 'user3', name: 'Gina Baker', age: 32 } },
      { create_user: { id: 'user4', name: 'Daniel Smith', age: 8 } },
    ]);
    const users = [0, 1, 2, 3, 4].map((i) => id_to_record_map['user' + i]);
    let records: _Archive[] = await models.connection!._Archive.where();
    expect(records).to.have.length(0);
    let count = await models.User.find(users[3].id).delete();
    expect(count).to.equal(1);
    records = await models.connection!._Archive.where();
    expect(records).to.have.length(1);
    _compareUser(records[0], users[3]);
    count = await models.User.delete({ age: 27 });
    expect(count).to.equal(2);
    records = await models.connection!._Archive.where();
    expect(records).to.have.length(3);
    records.sort((a, b) => (a.data.id < b.data.id ? -1 : 1));
    users.sort((a, b) => (a.id < b.id ? -1 : 1));
    _compareUser(records[0], users[0]);
    _compareUser(records[1], users[2]);
    _compareUser(records[2], users[3]);
  });

  it('by integrity', async () => {
    const id_to_record_map = await models.connection!.manipulate([
      { create_user: { id: 'user0', name: 'John Doe', age: 27 } },
      { create_user: { id: 'user1', name: 'Bill Smith', age: 45 } },
      { create_post: { id: 'post0', user_id: 'user0', title: 'first post', body: 'This is the 1st post.' } },
      { create_post: { id: 'post1', user_id: 'user0', title: 'second post', body: 'This is the 2st post.' } },
      { create_post: { id: 'post2', user_id: 'user1', title: 'another post', body: 'This is a post by user1.' } },
    ]);
    const users = [0].map((i) => id_to_record_map['user' + i]);
    const posts = [0, 1].map((i) => id_to_record_map['post' + i]);
    let records: _Archive[] = await models.connection!._Archive.where();
    expect(records).to.have.length(0);
    const count = await models.User.find(users[0].id).delete();
    expect(count).to.equal(1);
    records = await models.connection!._Archive.where();
    expect(records).to.have.length(3);
    records.sort((a, b) => {
      if (a.model < b.model) {
        return -1;
      }
      if (a.model > b.model) {
        return 1;
      }
      return a.data.id < b.data.id ? -1 : 1;
    });
    posts.sort((a, b) => (a.id < b.id ? -1 : 1));
    _compareUser(records[2], users[0]);
    _comparePost(records[0], posts[0]);
    _comparePost(records[1], posts[1]);
  });
}
