import * as cormo from '..';
import cases, { UserRef, PostRef } from './cases/archive';
import _g = require('./support/common');

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('archive-' + db, () => {
    const models = {
      User: UserRef,
      Post: PostRef,
      connection: null as cormo.Connection | null,
    };

    before(async () => {
      _g.connection = models.connection = new cormo.Connection(db as any, _g.db_configs[db]);

      @cormo.Model()
      class User extends _g.BaseModel {
        @cormo.Column('string')
        public name?: string;

        @cormo.Column('number')
        public age?: number;

        @cormo.HasMany({ integrity: 'delete' })
        public posts?: any[];
      }
      User.archive = true;
      models.User = User;

      @cormo.Model()
      class Post extends _g.BaseModel {
        @cormo.Column('string')
        public title?: string;

        @cormo.Column('string')
        public body?: string;

        @cormo.BelongsTo()
        public user?: any;
      }
      Post.archive = true;
      models.Post = Post;

      await _g.connection.dropAllModels();
    });

    beforeEach(async () => {
      await _g.deleteAllRecords([_g.connection!._Archive, models.Post, models.User]);
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
