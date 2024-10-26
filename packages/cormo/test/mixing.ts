import * as cormo from '..';
import { ComputerRef, PostRef, UserRef } from './cases/association';
import cases_as from './cases/association_as';
import cases_belongs_to from './cases/association_belongs_to';
import cases_has_many from './cases/association_has_many';
import _g from './support/common';

if (_g.db_configs.mysql && _g.db_configs.mongodb) {
  describe('mixing several database', () => {
    let mysql: cormo.Connection | null;
    let mongodb: cormo.Connection | null;
    const models = {
      Computer: ComputerRef,
      Post: PostRef,
      User: UserRef,
      connection: null as cormo.Connection | null,
    };

    before(async () => {
      mysql = new cormo.MySQLConnection(_g.db_configs.mysql);
      mongodb = new cormo.MongoDBConnection(_g.db_configs.mongodb);
      if (_g.use_class) {
        @cormo.Model({ connection: mongodb })
        class User extends cormo.BaseModel {
          @cormo.Column(String)
          public name?: string | null;

          @cormo.Column(Number)
          public age?: number | null;

          @cormo.HasMany({ connection: mysql })
          public posts?: { build: (data: any) => PostRef } & ((reload?: boolean) => Promise<PostRef[]>);
        }
        models.User = User;

        @cormo.Model({ connection: mysql })
        class Post extends cormo.BaseModel {
          @cormo.Column(String)
          public title?: string | null;

          @cormo.Column(String)
          public body?: string | null;

          @cormo.BelongsTo({ connection: mongodb })
          public user?: () => Promise<User | null>;

          public user_id?: number | null;

          @cormo.HasMany({ type: 'Post', foreign_key: 'parent_post_id' })
          public comments?: () => Promise<Post[]>;

          @cormo.BelongsTo({ type: 'Post' })
          public parent_post?: () => Promise<Post | null>;

          public parent_post_id?: number | null;
        }
        models.Post = Post;
      } else {
        models.User = mongodb.model('User', { name: String, age: Number });
        models.Post = mysql.model('Post', { title: String, body: String });

        models.User.hasMany(models.Post);
        models.Post.belongsTo(models.User);

        models.Post.hasMany(models.Post, { as: 'comments', foreign_key: 'parent_post_id' });
        models.Post.belongsTo(models.Post, { as: 'parent_post' });
      }
      _g.connection = {
        applySchemas: async () => {
          await mysql!.applySchemas();
          await mongodb!.applySchemas();
        },
      } as any;
      await mysql.dropAllModels();
      await mongodb.dropAllModels();
    });

    beforeEach(async () => {
      await _g.deleteAllRecords([models.User, models.Post]);
    });

    after(async () => {
      await mysql!.dropAllModels();
      await mongodb!.dropAllModels();
      mysql!.close();
      mongodb!.close();
      mysql = null;
      mongodb = null;
      _g.connection = null;
    });

    describe('#hasMany', () => {
      cases_has_many(models);
    });
    describe('#belongsTo', () => {
      cases_belongs_to(models);
    });
    describe('#as', () => {
      cases_as(models);
    });
  });
}
