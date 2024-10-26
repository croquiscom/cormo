import * as cormo from '..';
import cases, { UserRef } from './cases/callbacks';
import _g = require('./support/common');

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('callbacks-' + db, () => {
    const models = {
      User: UserRef,
      connection: null as cormo.Connection | null,
    };

    beforeEach(async () => {
      _g.connection = models.connection = new cormo.Connection(db as any, _g.db_configs[db]);

      @cormo.Model()
      class User extends _g.BaseModel {
        @cormo.Column('string')
        public name?: string;

        @cormo.Column('number')
        public age?: number;
      }
      models.User = User;

      await _g.connection.dropAllModels();
    });

    afterEach(async () => {
      await models.connection!.dropAllModels();
      models.connection!.close();
      models.connection = null;
      _g.connection = null;
    });

    cases(models);
  });
});
