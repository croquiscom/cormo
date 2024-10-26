import * as cormo from '../lib/esm/index.js';
import { UserExtraRef, UserRef } from './cases/transaction.js';
import cases_bind from './cases/transaction_bind.js';
import cases_block from './cases/transaction_block.js';
import cases_etc from './cases/transaction_etc.js';
import cases_full_control from './cases/transaction_full_control.js';
import _g from './support/common.js';

const _dbs = ['mysql', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('transaction-' + db, () => {
    const models = {
      User: UserRef,
      UserExtra: UserExtraRef,
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

      @cormo.Model()
      class UserExtra extends cormo.BaseModel {
        @cormo.BelongsTo({ type: 'User' })
        public user?: () => User | null;
        public user_id?: number;

        @cormo.Column(String)
        public phone_number?: string | null;
      }
      models.UserExtra = UserExtra;

      await _g.connection.dropAllModels();
    });

    beforeEach(async () => {
      await _g.deleteAllRecords([models.User, models.UserExtra]);
    });

    after(async () => {
      await models.connection!.dropAllModels();
      models.connection!.close();
      models.connection = null;
      _g.connection = null;
    });

    describe('#full control', () => {
      cases_full_control(models);
    });
    describe('#block', () => {
      cases_block(models);
    });
    describe('#bind', () => {
      cases_bind(models);
    });
    describe('#etc', () => {
      cases_etc(models);
    });
  });
});
