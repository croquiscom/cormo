import cases from './cases/nested';
import _g from './support/common';

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('nested-' + db, () => {
    cases(db, _g.db_configs[db]);
  });
});
