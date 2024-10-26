import { expect } from 'chai';
import { ComputerRef, PostRef, UserRef } from './association.js';

function _compareComment(a: PostRef, b: PostRef) {
  expect(a).to.have.property('title', b.title);
  expect(a).to.have.property('body', b.body);
  return expect(a).to.have.property('parent_post_id', b.parent_post_id);
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
    expect(comments).to.have.length(2);
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
    expect(post).to.have.property('id', record!.id);
    expect(post).to.have.property('title', record!.title);
    expect(post).to.have.property('body', record!.body);
  });
}
