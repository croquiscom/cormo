import { expect, it } from 'vitest';
import { ComputerRef, PostRef, UserRef } from './association.js';

function _compareComment(a: PostRef, b: PostRef) {
  expect(a).toHaveProperty('title', b.title);
  expect(a).toHaveProperty('body', b.body);
  return expect(a).toHaveProperty('parent_post_id', b.parent_post_id);
}

export default function (models: { Computer: typeof ComputerRef; Post: typeof PostRef; User: typeof UserRef }) {
  it('get sub objects', async () => {
    const post = await models.Post.create({ title: 'my post', body: 'This is a my post.' });
    const comment1 = await models.Post.create({
      body: 'This is the 1st comment.',
      parent_post_id: post.id,
      title: 'first comment',
    });
    const comment2 = await models.Post.create({
      body: 'This is the 2nd comment.',
      parent_post_id: post.id,
      title: 'second comment',
    });
    const comments = await post.comments!();
    expect(comments).toHaveLength(2);
    comments.sort((a, b) => (a.body! < b.body! ? -1 : 1));
    _compareComment(comments[0], comment1);
    _compareComment(comments[1], comment2);
  });

  it('get associated object', async () => {
    const post = await models.Post.create({ title: 'my post', body: 'This is a my post.' });
    const comment1 = await models.Post.create({
      body: 'This is the 1st comment.',
      parent_post_id: post.id,
      title: 'first comment',
    });
    const record = await comment1.parent_post!();
    expect(post).toHaveProperty('id', record!.id);
    expect(post).toHaveProperty('title', record!.title);
    expect(post).toHaveProperty('body', record!.body);
  });
}
