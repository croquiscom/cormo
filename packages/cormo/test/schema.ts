import cases from './cases/schema';
import cases_description from './cases/schema_description';
import _g from './support/common';

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('schema-' + db, () => {
    cases(db, _g.db_configs[db]);

    describe('#description', () => {
      cases_description(db, _g.db_configs[db]);
    });
  });
});
