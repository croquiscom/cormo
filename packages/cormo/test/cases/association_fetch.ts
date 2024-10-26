import { expect } from 'chai';
import * as cormo from '../../lib/esm/index.js';
import { ComputerRef, PostRef, UserRef } from './association.js';

function _checkPost(
  Post: typeof PostRef,
  User: typeof UserRef,
  post: PostRef,
  title: string,
  user_id: number | null,
  user_name?: string,
  user_age?: number,
) {
  expect(post).to.be.an.instanceof(Post);
  expect(post).to.have.property('title', title);
  expect(post).to.have.property('user');
  if (user_id) {
    expect(post.user).to.be.an.instanceof(User);
    if (user_age) {
      expect(post.user).to.have.keys('id', 'name', 'age');
    } else {
      expect(post.user).to.have.keys('id', 'name');
    }
    expect(post.user).to.have.property('id', user_id);
    expect(post.user).to.have.property('name', user_name);
    if (user_age) {
      expect(post.user).to.have.property('age', user_age);
    }
  } else {
    expect(post.user).to.not.exist;
  }
}

function _checkUser(
  User: typeof UserRef,
  Post: typeof PostRef,
  user: UserRef,
  name: string,
  post_ids: number[],
  post_titles: string[],
  has_post_body: boolean,
) {
  expect(user).to.be.an.instanceof(User);
  expect(user).to.have.property('name', name);
  expect(user).to.have.property('posts');
  expect(user.posts).to.have.length(post_ids.length);
  (user.posts as any as PostRef[]).forEach((post, i) => {
    expect(post).to.be.an.instanceof(Post);
    if (!has_post_body) {
      expect(post).to.have.keys('id', 'user_id', 'title');
    } else {
      expect(post).to.have.keys('id', 'user_id', 'title', 'body', 'parent_post_id');
    }
    expect(post.id).to.equal(post_ids[i]);
    expect(post.title).to.equal(post_titles[i]);
  });
}

export default function (models: {
  connection: cormo.Connection | null;
  Computer: typeof ComputerRef;
  Post: typeof PostRef;
  User: typeof UserRef;
}) {
  let preset_posts: PostRef[];
  let preset_users: UserRef[];

  beforeEach(async () => {
    const user1 = await models.User.create({ name: 'John Doe', age: 27 });
    const user2 = await models.User.create({ name: 'Bill Smith', age: 45 });
    preset_users = [user1, user2];
    const post1 = await models.Post.create({ user_id: user1.id, title: 'first post', body: 'This is the 1st post.' });
    const post2 = await models.Post.create({ user_id: user1.id, title: 'second post', body: 'This is the 2st post.' });
    const post3 = await models.Post.create({
      body: 'This is a post by user1.',
      title: 'another post',
      user_id: user2.id,
    });
    preset_posts = [post1, post2, post3];
  });

  it('fetch objects that belong to', async () => {
    const posts = await models.Post.where();
    await models.connection!.fetchAssociated(posts, 'user');
    expect(posts).to.have.length(3);
    _checkPost(models.Post, models.User, posts[0], 'first post', preset_users[0].id, 'John Doe', 27);
    _checkPost(models.Post, models.User, posts[1], 'second post', preset_users[0].id, 'John Doe', 27);
    _checkPost(models.Post, models.User, posts[2], 'another post', preset_users[1].id, 'Bill Smith', 45);
  });

  it('fetch an object that belongs to', async () => {
    const post = await models.Post.find(preset_posts[0].id);
    await models.connection!.fetchAssociated(post, 'user');
    _checkPost(models.Post, models.User, post, 'first post', preset_users[0].id, 'John Doe', 27);
  });

  it('fetch objects that belong to with select', async () => {
    const posts = await models.Post.where();
    await models.connection!.fetchAssociated(posts, 'user', 'name');
    expect(posts).to.have.length(3);
    _checkPost(models.Post, models.User, posts[0], 'first post', preset_users[0].id, 'John Doe');
    _checkPost(models.Post, models.User, posts[1], 'second post', preset_users[0].id, 'John Doe');
    _checkPost(models.Post, models.User, posts[2], 'another post', preset_users[1].id, 'Bill Smith');
  });

  it('fetch objects that have many', async () => {
    const users = await models.User.where();
    await models.connection!.fetchAssociated(users, 'posts');
    expect(users).to.have.length(2);
    _checkUser(
      models.User,
      models.Post,
      users[0],
      'John Doe',
      [preset_posts[0].id, preset_posts[1].id],
      ['first post', 'second post'],
      true,
    );
    _checkUser(models.User, models.Post, users[1], 'Bill Smith', [preset_posts[2].id], ['another post'], true);
  });

  it('fetch an object that has many', async () => {
    const user = await models.User.find(preset_users[0].id);
    await models.connection!.fetchAssociated(user, 'posts');
    _checkUser(
      models.User,
      models.Post,
      user,
      'John Doe',
      [preset_posts[0].id, preset_posts[1].id],
      ['first post', 'second post'],
      true,
    );
  });

  it('fetch objects that have many with select', async () => {
    const users = await models.User.where();
    await models.connection!.fetchAssociated(users, 'posts', 'title');
    expect(users).to.have.length(2);
    _checkUser(
      models.User,
      models.Post,
      users[0],
      'John Doe',
      [preset_posts[0].id, preset_posts[1].id],
      ['first post', 'second post'],
      false,
    );
    _checkUser(models.User, models.Post, users[1], 'Bill Smith', [preset_posts[2].id], ['another post'], false);
  });

  it('null id', async () => {
    await models.Post.find(preset_posts[1].id).update({ user_id: null });
    const posts = await models.Post.where().order('id');
    await models.connection!.fetchAssociated(posts, 'user');
    expect(posts).to.have.length(3);
    _checkPost(models.Post, models.User, posts[0], 'first post', preset_users[0].id, 'John Doe', 27);
    _checkPost(models.Post, models.User, posts[1], 'second post', null);
    _checkPost(models.Post, models.User, posts[2], 'another post', preset_users[1].id, 'Bill Smith', 45);
    const users = await models.User.where().order('id');
    await models.connection!.fetchAssociated(users, 'posts');
    expect(users).to.have.length(2);
    _checkUser(models.User, models.Post, users[0], 'John Doe', [preset_posts[0].id], ['first post'], true);
    _checkUser(models.User, models.Post, users[1], 'Bill Smith', [preset_posts[2].id], ['another post'], true);
  });

  it('invalid id', async () => {
    await models.User.find(preset_users[1].id).delete();
    const posts = await models.Post.where().order('id');
    await models.connection!.fetchAssociated(posts, 'user');
    expect(posts).to.have.length(3);
    _checkPost(models.Post, models.User, posts[0], 'first post', preset_users[0].id, 'John Doe', 27);
    _checkPost(models.Post, models.User, posts[1], 'second post', preset_users[0].id, 'John Doe', 27);
    _checkPost(models.Post, models.User, posts[2], 'another post', null);
    const post = await models.Post.find(preset_posts[2].id);
    await models.connection!.fetchAssociated(post, 'user');
    _checkPost(models.Post, models.User, post, 'another post', null);
  });
}
