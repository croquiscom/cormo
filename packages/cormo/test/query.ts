import * as cormo from '..';
import cases, { UserRef, LedgerRef } from './cases/query';
import cases_misc from './cases/query_misc';
import cases_not from './cases/query_not';
import cases_null from './cases/query_null';
import cases_op from './cases/query_op';
import cases_stream from './cases/query_stream';
import cases_update from './cases/query_update';
import cases_upsert from './cases/query_upsert';
import _g = require('./support/common');

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('query-' + db, () => {
    const models = {
      User: UserRef,
      Ledger: LedgerRef,
      connection: null as cormo.Connection | null,
    };

    before(async () => {
      _g.connection = models.connection = new cormo.Connection(db as any, _g.db_configs[db]);
      if (_g.use_class) {
        @cormo.Model()
        class User extends cormo.BaseModel {
          @cormo.Column(String)
          public name?: string;

          @cormo.Column(Number)
          public age?: number;
        }
        models.User = User;

        @cormo.Model()
        class Ledger extends cormo.BaseModel {
          @cormo.Column(cormo.types.Integer)
          public date_ymd?: number;

          @cormo.Column(Number)
          public debit?: number;

          @cormo.Column(Number)
          public credit?: number;

          @cormo.Column(Number)
          public balance?: number;
        }
        models.Ledger = Ledger;
      } else {
        models.User = _g.connection.model('User', {
          name: String,
          age: Number,
        });
        models.Ledger = _g.connection.model('Ledger', {
          date_ymd: cormo.types.Integer,
          debit: Number,
          credit: Number,
          balance: Number,
        });
      }
      await _g.connection.dropAllModels();
    });

    beforeEach(async () => {
      await _g.deleteAllRecords([models.User, models.Ledger]);
    });

    after(async () => {
      await models.connection!.dropAllModels();
      models.connection!.close();
      models.connection = null;
      _g.connection = null;
    });

    describe('#simple', () => {
      cases(models);
    });
    describe('#op', () => {
      cases_op(models);
    });
    describe('#$not', () => {
      cases_not(models);
    });
    describe('#null', () => {
      cases_null(models);
    });
    describe('#update', () => {
      cases_update(models);
    });
    describe('#upsert', () => {
      cases_upsert(models);
    });
    describe('#stream', () => {
      cases_stream(models);
    });
    describe('#misc', () => {
      cases_misc(models);
    });
  });
});
