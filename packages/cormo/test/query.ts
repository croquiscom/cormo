import * as cormo from '..';
import cases, { UserRef } from './cases/query';
import cases_op from './cases/query_op';
import cases_misc from './cases/query_misc';
import cases_not from './cases/query_not';
import cases_null from './cases/query_null';
import cases_stream from './cases/query_stream';
import cases_update from './cases/query_update';
import cases_upsert from './cases/query_upsert';
import _g = require('./support/common');

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('query-' + db, () => {
    const models = {
      User: UserRef,
      UserUnique: UserRef,
      connection: null as cormo.Connection | null,
    };

    before(async () => {
      _g.connection = models.connection = new cormo.Connection(db as any, _g.db_configs[db]);
      if (_g.use_class) {
        @cormo.Model()
        class User extends cormo.BaseModel {
          @cormo.Column(String)
          public name?: string;

          @cormo.Column(Number)
          public age?: number;
        }
        models.User = User;

        @cormo.Model()
        class UserUnique extends cormo.BaseModel {
          @cormo.Column({ type: String, unique: true })
          public name?: string;

          @cormo.Column(Number)
          public age?: number;
        }
        models.UserUnique = UserUnique;
      } else {
        models.User = _g.connection.model('User', {
          age: Number,
          name: String,
        });
        models.UserUnique = _g.connection.model('UserUnique', {
          age: Number,
          name: { type: String, unique: true },
        });
      }
      await _g.connection.dropAllModels();
    });

    beforeEach(async () => {
      await _g.deleteAllRecords([models.User, models.UserUnique]);
    });

    after(async () => {
      await models.connection!.dropAllModels();
      models.connection!.close();
      models.connection = null;
      _g.connection = null;
    });

    describe('#simple', () => {
      cases(models);
    });
    describe('#op', () => {
      cases_op(models);
    });
    describe('#$not', () => {
      cases_not(models);
    });
    describe('#null', () => {
      cases_null(models);
    });
    describe('#update', () => {
      cases_update(models);
    });
    describe('#upsert', () => {
      cases_upsert(models);
    });
    describe('#stream', () => {
      cases_stream(models);
    });
    describe('#misc', () => {
      cases_misc(models);
    });
  });
});
