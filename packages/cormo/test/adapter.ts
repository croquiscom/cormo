import * as cormo from '../src/index.js';
import cases_mongodb from './cases/adapter-mongodb.js';
import cases_mysql from './cases/adapter-mysql.js';
import cases_postgresql from './cases/adapter-postgresql.js';
import cases_sqlite3 from './cases/adapter-sqlite3.js';
import _g from './support/common.js';

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

    if (db === 'mysql') {
      cases_mysql(models as any);
    } else if (db === 'mongodb') {
      cases_mongodb(models as any);
    } else if (db === 'sqlite3') {
      cases_sqlite3(models as any);
    } else if (db === 'postgresql') {
      cases_postgresql(models as any);
    }
  });
});
