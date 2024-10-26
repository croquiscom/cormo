import * as cormo from '../lib/esm/index.js';
import cases, { UserRef } from './cases/timestamp.js';
import _g from './support/common.js';

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('timestamp-' + db, () => {
    const models = {
      User: UserRef,
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
        }
        User.timestamps();
        models.User = User;
      } else {
        models.User = _g.connection.model('User', {
          name: String,
          age: Number,
        });
        models.User.timestamps();
      }
      await _g.connection.dropAllModels();
    });

    beforeEach(async function () {
      await _g.deleteAllRecords([models.User]);
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
