import cases, { User as UserRef } from './cases/basic';
import * as cormo from '..';
import _g = require('./support/common');

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql', 'redis'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('basic-' + db, () => {
    let connection: cormo.Connection | null;
    const models = {
      User: UserRef,
    };

    before(async () => {
      _g.connection = connection = new cormo.Connection(db as any, _g.db_configs[db]);
      if (_g.use_class) {
        @cormo.Model()
        class User extends cormo.BaseModel {
          @cormo.Column(String)
          public name!: string | null;

          @cormo.Column(Number)
          public age!: number | null;
        }
        models.User = User;
      } else {
        models.User = connection.model('User', {
          age: Number,
          name: String,
        }) as typeof UserRef;
      }
      await connection.dropAllModels();
    });

    beforeEach(async () => {
      await _g.deleteAllRecords([models.User]);
    });

    after(async () => {
      await connection!.dropAllModels();
      connection!.close();
      connection = null;
      _g.connection = null;
    });

    cases(models);
  });
});
