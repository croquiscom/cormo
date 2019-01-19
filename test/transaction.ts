// tslint:disable:max-classes-per-file

import * as cormo from '..';
import { UserRef } from './cases/transaction';
import cases_baisc from './cases/transaction_basic';
import _g = require('./support/common');

const _dbs = ['mysql', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('transaction-' + db, () => {
    const models = {
      User: UserRef,
      connection: null as cormo.Connection | null,
    };

    before(async () => {
      _g.connection = models.connection = new cormo.Connection(db as any, _g.db_configs[db]);

      @cormo.Model()
      class User extends cormo.BaseModel {
        @cormo.Column(String)
        public name?: string;

        @cormo.Column(Number)
        public age?: number;
      }
      models.User = User;

      await _g.connection.dropAllModels();
    });

    beforeEach(async () => {
      await _g.deleteAllRecords([models.User]);
    });

    after(async () => {
      await models.connection!.dropAllModels();
      models.connection!.close();
      models.connection = null;
      _g.connection = null;
    });

    describe('#basic', () => {
      cases_baisc(models);
    });
  });
});
