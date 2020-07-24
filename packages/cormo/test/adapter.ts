import * as cormo from '..';
import _g = require('./support/common');

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('adapter-' + db, () => {
    const models = {
      connection: null as cormo.Connection | null,
    };

    before(async () => {
      _g.connection = models.connection = new cormo.Connection(db as any, _g.db_configs[db]);

      await models.connection.dropAllModels();
    });

    afterEach(async () => {
      await models.connection!.dropAllModels();
    });

    after(() => {
      models.connection!.close();
      models.connection = null;
      _g.connection = null;
    });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./cases/adapter-' + db).default(models);
  });
});
