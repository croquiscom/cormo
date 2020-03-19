import { expect } from 'chai';
import { ComputerRef, PostRef, UserRef } from './association';

export default function(models: {
  Computer: typeof ComputerRef;
  Post: typeof PostRef;
  User: typeof UserRef;
}) {
  it('get associated object', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const post = await models.Post.create({
      body: 'This is the 1st post.',
      title: 'first post',
      user_id: user.id,
    });
    const record = await post.user!();
    expect(user).to.eql(record);
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
    expect(record.id).to.equal(post_id);
    expect(record.title).to.equal('first post');
    expect(record.body).to.equal('This is the 1st post.');
    expect(record.user_id).to.equal(user_id);
    expect(record.parent_post_id).to.not.exist;
  });
}
