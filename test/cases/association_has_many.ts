// tslint:disable:no-unused-expression

import { expect } from 'chai';
import * as cormo from '../..';
import { ComputerRef, PostRef, UserRef } from './association';

function _comparePost(a: PostRef, b: PostRef) {
  expect(a).to.have.property('user_id', b.user_id);
  expect(a).to.have.property('title', b.title);
  expect(a).to.have.property('body', b.body);
}

export default function(models: {
  Computer: typeof ComputerRef,
  Post: typeof PostRef,
  User: typeof UserRef,
}) {
  it('collection_accessor.build on a new object', async () => {
    // create two new objects
    const user1 = models.User.build({ name: 'John Doe', age: 27 });
    expect(user1.posts).to.exist;
    const user2 = models.User.build({ name: 'Bill Smith', age: 45 });
    expect(user2.posts).to.exist;
    // check default status
    const user1_posts = await user1.posts!();
    expect(user1_posts).to.have.length(0);
    const user2_posts = await user2.posts!();
    expect(user2_posts).to.have.length(0);
    // call build method and check status
    const posts1 = user1.posts!;
    const posts2 = user2.posts!;
    posts1.build({ title: 'first post', body: 'This is the 1st post.' });
    posts1.build({ title: 'second post', body: 'This is the 2nd post.' });
    posts2.build({ title: 'third post', body: 'This is the 3rd post.' });
    const posts1_records = await posts1();
    expect(posts1_records).to.have.length(2);
    expect(posts1_records[0].user_id).to.not.exist;
    expect(posts1_records[0]).to.have.property('title', 'first post');
    expect(posts1_records[1].user_id).to.not.exist;
    expect(posts1_records[1]).to.have.property('title', 'second post');
    const posts2_records = await posts2();
    expect(posts2_records).to.have.length(1);
    expect(posts2_records[0].user_id).to.not.exist;
    expect(posts2_records[0]).to.have.property('title', 'third post');
  });

  it('collection_accessor.build on an existing object', async () => {
    // create two new objects
    const user1 = await models.User.create({ name: 'John Doe', age: 27 });
    expect(user1.posts).to.exist;
    const user2 = await models.User.create({ name: 'Bill Smith', age: 45 });
    expect(user2.posts).to.exist;
    // check default status
    const user1_posts = await user1.posts!();
    expect(user1_posts).to.have.length(0);
    const user2_posts = await user2.posts!();
    expect(user2_posts).to.have.length(0);
    // call build method and check status
    const posts1 = user1.posts!;
    const posts2 = user2.posts!;
    posts1.build({ title: 'first post', body: 'This is the 1st post.' });
    posts1.build({ title: 'second post', body: 'This is the 2nd post.' });
    posts2.build({ title: 'third post', body: 'This is the 3rd post.' });
    const posts1_records = await posts1();
    expect(posts1_records).to.have.length(2);
    expect(posts1_records[0]).to.have.property('user_id', user1.id);
    expect(posts1_records[0]).to.have.property('title', 'first post');
    expect(posts1_records[1]).to.have.property('user_id', user1.id);
    expect(posts1_records[1]).to.have.property('title', 'second post');
    const posts2_records = await posts2();
    expect(posts2_records).to.have.length(1);
    expect(posts2_records[0]).to.have.property('user_id', user2.id);
    expect(posts2_records[0]).to.have.property('title', 'third post');
  });

  it('save object after creating a sub object', async () => {
    const user = models.User.build({ name: 'John Doe', age: 27 });
    const post = user.posts!.build({ title: 'first post', body: 'This is the 1st post.' });
    expect(user.id).to.not.exist;
    expect(post.id).to.not.exist;
    expect(post.user_id).to.not.exist;
    await user.save();
    expect(user).to.have.property('id');
    expect(post).to.have.property('id');
    expect(post).to.have.property('user_id', user.id);
  });

  it('get sub objects', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const post1 = await models.Post.create({ title: 'first post', body: 'This is the 1st post.', user_id: user.id });
    const post2 = await models.Post.create({ title: 'second post', body: 'This is the 2nd post.', user_id: user.id });
    const posts = await user.posts!();
    expect(posts).to.have.length(2);
    posts.sort((a, b) => a.body! < b.body! ? -1 : 1);
    _comparePost(posts[0], post1);
    _comparePost(posts[1], post2);
  });

  it('sub objects are cached', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const post1 = await models.Post.create({ title: 'first post', body: 'This is the 1st post.', user_id: user.id });
    const user_posts1 = await user.posts!();
    expect(user_posts1).to.have.length(1);
    _comparePost(user_posts1[0], post1);
    const post2 = await models.Post.create({ title: 'second post', body: 'This is the 2nd post.', user_id: user.id });
    const user_posts2 = await user.posts!();
    // added object is not fetched
    expect(user_posts2).to.have.length(1);
    _comparePost(user_posts2[0], post1);
    // ignore cache and force reload
    const user_posts3 = await user.posts!(true);
    expect(user_posts3).to.have.length(2);
    user_posts3.sort((a, b) => a.body! < b.body! ? -1 : 1);
    _comparePost(user_posts3[0], post1);
    _comparePost(user_posts3[1], post2);
  });
}
