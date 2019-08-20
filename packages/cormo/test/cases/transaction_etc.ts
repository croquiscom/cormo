// tslint:disable:variable-name

import { expect } from 'chai';
import * as cormo from '../..';

export default function(models: {
  connection: cormo.Connection | null,
}) {
  let User: typeof cormo.BaseModel;
  let Post: typeof cormo.BaseModel;

  before(async () => {
    User = models.connection!.model('User', { name: String, age: Number });
    Post = models.connection!.model('Post', { title: String, body: String });

    User.hasMany(Post);
    Post.belongsTo(User);

    await models.connection!.applySchemas();
  });

  beforeEach(async () => {
    await User.deleteAll();
    await Post.deleteAll();
  });

  after(async () => {
    await User.drop();
    await Post.drop();
  });

  it('include', async () => {
    const tx = await models.connection!.getTransaction();
    try {
      const user = await User.create({ name: 'John Doe', age: 27 }, { transaction: tx });
      const post1 = await Post.create(
        { user_id: user.id, title: 'first post', body: 'This is the 1st post.' },
        { transaction: tx },
      );
      const post2 = await Post.create(
        { user_id: user.id, title: 'second post', body: 'This is the 2st post.' },
        { transaction: tx },
      );
      const users = await User.query({ transaction: tx }).include('posts', 'title');
      expect(users).to.eql([
        {
          age: 27,
          id: user.id,
          name: 'John Doe',
          posts: [
            { id: post1.id, user_id: user.id, title: 'first post' },
            { id: post2.id, user_id: user.id, title: 'second post' },
          ],
        },
      ]);

      await tx.commit();
    } finally {
      try { await tx.rollback(); } catch (error) { /**/ }
    }
  });
}
