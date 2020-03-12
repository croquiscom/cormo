import cases from './cases/nested';
import * as cormo from '..';
import _g = require('./support/common');

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('nested-' + db, () => {
    cases(db, _g.db_configs[db]);
  });
});
