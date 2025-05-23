/* global describe, before, beforeEach, after */

import cases from './cases/javascript.js';
import _g from './support/common.js';

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];
_dbs.forEach(function (db) {
  if (!_g.db_configs[db]) {
    return;
  }
  describe('javascript-' + db, function () {
    before(async function () {
      _g.connection = new _g.Connection(db, _g.db_configs[db]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const User = _g.connection.model('User', { name: String, age: Number });

      await _g.connection.dropAllModels();
    });

    beforeEach(async function () {
      await _g.deleteAllRecords([_g.connection.User]);
    });

    after(async function () {
      await _g.connection.dropAllModels();
    });

    cases();
  });
});
