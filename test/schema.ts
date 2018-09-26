import * as cormo from '..';
import cases from './cases/schema';
import _g = require('./support/common');

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('schema-' + db, () => {
    const models = {
      connection: null as cormo.Connection | null,
    };

    before(async () => {
      models.connection = new cormo.Connection(db as any, _g.db_configs[db]);
      await models.connection.dropAllModels();
    });

    after(async () => {
      await models.connection!.dropAllModels();
      models.connection!.close();
      models.connection = null;
    });

    cases(models);
  });
});
