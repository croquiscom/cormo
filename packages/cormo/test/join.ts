import * as cormo from '../src/index.js';
import cases, { ComputerRef, PostRef, UserRef } from './cases/join.js';
import _g from './support/common.js';

const _dbs = ['mysql', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('join-' + db, () => {
    const models = {
      Computer: ComputerRef,
      Post: PostRef,
      User: UserRef,
      connection: null as cormo.Connection | null,
    };

    before(async () => {
      _g.connection = models.connection = new cormo.Connection(db as any, _g.db_configs[db]);
      if (_g.use_class) {
        @cormo.Model()
        class User extends cormo.BaseModel {
          @cormo.Column(String)
          public name?: string | null;

          @cormo.Column(Number)
          public age?: number | null;

          @cormo.HasMany()
          public posts?: any;

          @cormo.HasOne()
          public computer?: any;
        }
        models.User = User;

        @cormo.Model()
        class Post extends cormo.BaseModel {
          @cormo.Column(String)
          public title?: string | null;

          @cormo.Column(String)
          public body?: string | null;

          @cormo.BelongsTo()
          public user?: any;

          public user_id?: number | null;

          @cormo.HasMany({ type: 'Post', foreign_key: 'parent_post_id' })
          public comments?: any;

          @cormo.BelongsTo({ type: 'Post' })
          public parent_post?: any;

          public parent_post_id?: number | null;
        }
        models.Post = Post;

        @cormo.Model()
        class Computer extends cormo.BaseModel {
          @cormo.Column(String)
          public brand?: string | null;

          @cormo.BelongsTo()
          public user?: any;

          public user_id?: number | null;
        }
        models.Computer = Computer;
      } else {
        models.User = models.connection.model('User', { name: String, age: Number });
        models.Post = models.connection.model('Post', { title: String, body: String });
        models.Computer = models.connection.model('Computer', { brand: String });

        models.User.hasMany(models.Post);
        models.Post.belongsTo(models.User);

        models.Post.hasMany(models.Post, { as: 'comments', foreign_key: 'parent_post_id' });
        models.Post.belongsTo(models.Post, { as: 'parent_post' });

        models.User.hasOne(models.Computer);
        models.Computer.belongsTo(models.User);
      }
      await _g.connection.dropAllModels();
    });

    beforeEach(async () => {
      await _g.deleteAllRecords([models.User, models.Post, models.Computer]);
    });

    after(async () => {
      await models.connection!.dropAllModels();
      models.connection!.close();
      models.connection = null;
      _g.connection = null;
    });

    cases(models);
  });
});
