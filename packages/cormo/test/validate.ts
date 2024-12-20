import * as cormo from '../src/index.js';
import cases, { User as UserRef } from './cases/validate.js';
import _g from './support/common.js';

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql', 'redis'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('validate-' + db, () => {
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

          @cormo.Column('string')
          public email?: string;
        }
        models.User = User;
      } else {
        models.User = _g.connection.model('User', {
          name: String,
          age: Number,
          email: String,
        });
      }

      // checkes age validity
      models.User.addValidator((record: any) => {
        if (record.age < 18) {
          return 'too young';
        }
      });

      // checkes email validity
      models.User.addValidator((record: any) => {
        if (record.email && !/^\w+@.+$/.test(record.email)) {
          throw new Error('invalid email');
        }
        return true;
      });

      await _g.connection.dropAllModels();
    });

    beforeEach(async () => {
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
