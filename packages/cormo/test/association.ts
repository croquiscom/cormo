import { ComputerRef, PostRef, UserRef } from './cases/association';
import cases_as from './cases/association_as';
import cases_belongs_to from './cases/association_belongs_to';
import cases_fetch from './cases/association_fetch';
import cases_has_many from './cases/association_has_many';
import cases_has_one from './cases/association_has_one';
import cases_include from './cases/association_include';
import cases_include_lean from './cases/association_include_lean';
import * as cormo from '..';
import _g = require('./support/common');

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('association-' + db, () => {
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
          public posts?: { build: (data: any) => PostRef } & ((reload?: boolean) => Promise<PostRef[]>);

          @cormo.HasOne()
          public computer?: () => Promise<Computer | null>;
        }
        models.User = User;

        @cormo.Model()
        class Post extends cormo.BaseModel {
          @cormo.Column(String)
          public title?: string | null;

          @cormo.Column(String)
          public body?: string | null;

          @cormo.BelongsTo()
          public user?: () => Promise<User | null>;

          public user_id?: number | null;

          @cormo.HasMany({ type: 'Post', foreign_key: 'parent_post_id' })
          public comments?: () => Promise<Post[]>;

          @cormo.BelongsTo({ type: 'Post' })
          public parent_post?: () => Promise<Post | null>

          public parent_post_id?: number | null;
        }
        models.Post = Post;

        @cormo.Model()
        class Computer extends cormo.BaseModel {
          @cormo.Column(String)
          public brand?: string | null;

          @cormo.BelongsTo()
          public user?: () => Promise<User | null>;

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

    describe('#hasMany', () => {
      cases_has_many(models);
    });
    describe('#hasOne', () => {
      cases_has_one(models);
    });
    describe('#belongsTo', () => {
      cases_belongs_to(models);
    });
    describe('#as', () => {
      cases_as(models);
    });
    describe('#fetch', () => {
      cases_fetch(models);
    });
    describe('#include', () => {
      cases_include(models);
    });
    describe('#include with lean', () => {
      cases_include_lean(models);
    });
  });
});
