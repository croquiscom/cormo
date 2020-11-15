import * as cormo from '..';
import cases, { UserRef, PostRef } from './cases/manipulate';
import _g = require('./support/common');

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('manipulate-' + db, () => {
    const models = {
      User: UserRef,
      Post: PostRef,
      connection: null as cormo.Connection | null,
    };

    before(async () => {
      _g.connection = models.connection = new cormo.Connection(db as any, _g.db_configs[db]);
      if (_g.use_class) {
        @cormo.Model()
        class User extends _g.BaseModel {
          @cormo.Column('string')
          public name?: string;

          @cormo.Column('number')
          public age?: number;

          @cormo.HasMany()
          public posts?: any[];
        }
        models.User = User;

        @cormo.Model()
        class Post extends _g.BaseModel {
          @cormo.Column('string')
          public title?: string;

          @cormo.Column('string')
          public body?: string;

          @cormo.BelongsTo()
          public user?: any;

          @cormo.Column([_g.cormo.types.RecordID])
          public readers?: number[];
        }
        models.Post = Post;
      } else {
        models.User = _g.connection.model('User', {
          name: String,
          age: Number,
        });
        models.Post = _g.connection.model('Post', {
          title: String,
          body: String,
          readers: [_g.cormo.types.RecordID],
        });
        models.User.hasMany(models.Post);
        models.Post.belongsTo(models.User);
      }
      await _g.connection.dropAllModels();
    });

    beforeEach(async function() {
      await _g.deleteAllRecords([models.User, models.Post]);
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
