import cases from './cases/misc';
import _g = require('./support/common');

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('schema-' + db, () => {
    cases(db, _g.db_configs[db]);
  });
});
