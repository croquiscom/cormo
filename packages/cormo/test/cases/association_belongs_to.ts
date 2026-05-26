import { expect, it } from 'vitest';
import { ComputerRef, PostRef, UserRef } from './association.js';

export default function (models: { Computer: typeof ComputerRef; Post: typeof PostRef; User: typeof UserRef }) {
  it('get associated object', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const post = await models.Post.create({
      body: 'This is the 1st post.',
      title: 'first post',
      user_id: user.id,
    });
    const record = await post.user!();
    expect(user).toEqual(record);
  });

  it('lean option for association', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const post = await models.Post.create({
      body: 'This is the 1st post.',
      title: 'first post',
      user_id: user.id,
    });
    const user_id = user.id;
    const post_id = post.id;
    const record = await models.Post.find(post_id).lean();
    expect(record.id).toBe(post_id);
    expect(record.title).toBe('first post');
    expect(record.body).toBe('This is the 1st post.');
    expect(record.user_id).toBe(user_id);
    expect(record.parent_post_id).not.toExist();
  });
}
