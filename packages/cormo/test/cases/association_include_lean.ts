import { expect, beforeEach, it } from 'vitest';
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
  expect(post).not.toBeInstanceOf(Post);
  expect(post).toHaveProperty('title', title);
  expect(post).toHaveProperty('user');
  if (user_id) {
    expect(post.user).not.toBeInstanceOf(User);
    if (user_age) {
      expect(post.user).toHaveKeys('id', 'name', 'age');
    } else {
      expect(post.user).toHaveKeys('id', 'name');
    }
    expect(post.user).toHaveProperty('id', user_id);
    expect(post.user).toHaveProperty('name', user_name);
    if (user_age) {
      expect(post.user).toHaveProperty('age', user_age);
    }
  } else {
    expect(post.user).not.toExist();
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
  expect(user).not.toBeInstanceOf(User);
  expect(user).toHaveProperty('name', name);
  expect(user).toHaveProperty('posts');
  expect(user.posts).toHaveLength(post_ids.length);
  (user.posts as any as PostRef[]).forEach((post, i) => {
    expect(post).not.toBeInstanceOf(Post);
    if (!has_post_body) {
      expect(post).toHaveKeys('id', 'user_id', 'title');
    } else {
      expect(post).toHaveKeys('id', 'user_id', 'title', 'body', 'parent_post_id');
    }
    expect(post.id).toBe(post_ids[i]);
    expect(post.title).toBe(post_titles[i]);
  });
}

export default function (models: { Computer: typeof ComputerRef; Post: typeof PostRef; User: typeof UserRef }) {
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

  it('include objects that belong to', async () => {
    const posts = await models.Post.query().lean().include('user');
    expect(posts).toHaveLength(3);
    _checkPost(models.Post, models.User, posts[0], 'first post', preset_users[0].id, 'John Doe', 27);
    _checkPost(models.Post, models.User, posts[1], 'second post', preset_users[0].id, 'John Doe', 27);
    _checkPost(models.Post, models.User, posts[2], 'another post', preset_users[1].id, 'Bill Smith', 45);
  });

  it('include an object that belongs to', async () => {
    const post = await models.Post.find(preset_posts[0].id).lean().include('user');
    _checkPost(models.Post, models.User, post, 'first post', preset_users[0].id, 'John Doe', 27);
  });

  it('include objects that belong to with select', async () => {
    const posts = await models.Post.query().lean().include('user', 'name');
    expect(posts).toHaveLength(3);
    _checkPost(models.Post, models.User, posts[0], 'first post', preset_users[0].id, 'John Doe');
    _checkPost(models.Post, models.User, posts[1], 'second post', preset_users[0].id, 'John Doe');
    _checkPost(models.Post, models.User, posts[2], 'another post', preset_users[1].id, 'Bill Smith');
  });

  it('include objects that have many', async () => {
    const users = await models.User.query().lean().include('posts');
    expect(users).toHaveLength(2);
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

  it('include an object that has many', async () => {
    const user = await models.User.find(preset_users[0].id).lean().include('posts');
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

  it('include objects that have many with select', async () => {
    const users = await models.User.query().lean().include('posts', 'title');
    expect(users).toHaveLength(2);
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
    const posts = await models.Post.query().lean().include('user').order('id');
    expect(posts).toHaveLength(3);
    _checkPost(models.Post, models.User, posts[0], 'first post', preset_users[0].id, 'John Doe', 27);
    _checkPost(models.Post, models.User, posts[1], 'second post', null);
    _checkPost(models.Post, models.User, posts[2], 'another post', preset_users[1].id, 'Bill Smith', 45);
    const users = await models.User.query().lean().include('posts').order('id');
    expect(users).toHaveLength(2);
    _checkUser(models.User, models.Post, users[0], 'John Doe', [preset_posts[0].id], ['first post'], true);
    _checkUser(models.User, models.Post, users[1], 'Bill Smith', [preset_posts[2].id], ['another post'], true);
  });

  it('invalid id', async () => {
    await models.User.find(preset_users[1].id).delete();
    const posts = await models.Post.query().lean().include('user').order('id');
    expect(posts).toHaveLength(3);
    _checkPost(models.Post, models.User, posts[0], 'first post', preset_users[0].id, 'John Doe', 27);
    _checkPost(models.Post, models.User, posts[1], 'second post', preset_users[0].id, 'John Doe', 27);
    _checkPost(models.Post, models.User, posts[2], 'another post', null);
    const post = await models.Post.find(preset_posts[2].id).lean().include('user');
    _checkPost(models.Post, models.User, post, 'another post', null);
  });

  it('modify associated property (belongs to)', async () => {
    const post = await models.Post.find(preset_posts[0].id).lean().include('user');
    (post as any).user = 'other value';
    expect(post.user).toBe('other value');
  });

  it('modify associated property (has many)', async () => {
    const user = await models.User.find(preset_users[0].id).lean().include('posts');
    (user as any).posts = 'other value';
    expect(user.posts).toBe('other value');
  });
}
