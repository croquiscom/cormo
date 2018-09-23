// tslint:disable:max-classes-per-file

import * as cormo from '..';
import cases, { PostRef, UserRef } from './cases/constraint';
import cases_multicolumn, { VersionRef } from './cases/constraint_multicolumn';
import _g = require('./support/common');

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('constraint-' + db, () => {
    describe('#basic', () => {
      let connection: cormo.Connection | null;
      const models = {
        Post: PostRef,
        User: UserRef,
      };

      before(async () => {
        _g.connection = connection = new cormo.Connection(db as any, _g.db_configs[db]);
        if (_g.use_class) {
          @cormo.Model()
          class User extends cormo.BaseModel {
            @cormo.Column({ type: String, required: true })
            public name!: string;

            @cormo.Column({ type: Number, required: true })
            public age!: number;

            @cormo.Column({ type: String, unique: true, required: true })
            public email!: string;

            @cormo.Column({ type: String, unique: true })
            public facebook_id?: string | null;
          }
          models.User = User;

          @cormo.Model()
          class Post extends cormo.BaseModel {
            @cormo.Column(String)
            public title?: string | null;

            @cormo.Column(String)
            public body?: string | null;

            @cormo.BelongsTo({ required: true })
            public user?: () => User;
            public user_id!: number;
          }
          models.Post = Post;
        } else {
          models.User = connection.model('User', {
            age: { type: Number, required: true },
            email: { type: String, unique: true, required: true },
            facebook_id: { type: String, unique: true },
            name: { type: String, required: true },
          }) as typeof UserRef;
          models.Post = connection.model('Post', {
            body: String,
            title: String,
          }) as typeof PostRef;
          models.Post.belongsTo(models.User, { required: true });
        }
        await connection.dropAllModels();
      });

      beforeEach(async () => {
        await _g.deleteAllRecords([models.User, models.Post]);
      });

      after(async () => {
        await connection!.dropAllModels();
        connection!.close();
        connection = null;
        _g.connection = null;
      });

      cases(models);
    });

    describe('#multicolumn', () => {
      let connection: cormo.Connection | null;
      const models = {
        Version: VersionRef,
      };

      before(async () => {
        _g.connection = connection = new cormo.Connection(db as any, _g.db_configs[db]);
        if (_g.use_class) {
          @cormo.Model()
          @cormo.Index({ major: 1, minor: 1 }, { unique: true })
          class Version extends cormo.BaseModel {
            @cormo.Column('number')
            public major?: number | null;

            @cormo.Column('number')
            public minor?: number | null;
          }
          models.Version = Version;
        } else {
          models.Version = connection.model('Version', { major: Number, minor: Number });
          models.Version.index({ major: 1, minor: 1 }, { unique: true });
        }
        await connection.dropAllModels();
      });

      beforeEach(async () => {
        await _g.deleteAllRecords([models.Version]);
      });

      after(async () => {
        await connection!.dropAllModels();
        connection!.close();
        connection = null;
        _g.connection = null;
      });

      cases_multicolumn(models);
    });
  });
});
