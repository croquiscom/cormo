import * as cormo from '..';
import cases, { Type as TypeRef } from './cases/type';
import cases_compare from './cases/type_compare';
import cases_options from './cases/type_options';
import cases_update from './cases/type_update';
import _g = require('./support/common');

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('type-' + db, () => {
    const models = {
      Type: TypeRef,
      connection: null as cormo.Connection | null,
    };

    before(async () => {
      _g.connection = models.connection = new cormo.Connection(db as any, _g.db_configs[db]);

      if (_g.use_class) {
        @cormo.Model()
        class Type extends cormo.BaseModel {
          @cormo.Column('number')
          public number?: number;

          @cormo.Column('integer')
          public int_c?: number;

          @cormo.Column('biginteger')
          public bigint_c?: number;

          @cormo.Column('date')
          public date?: Date;

          @cormo.Column('boolean')
          public boolean?: boolean;

          @cormo.Column('object')
          public object?: object;

          @cormo.Column('string')
          public string?: string;

          @cormo.Column(['integer'])
          public int_array?: number[];

          @cormo.Column('recordid')
          public recordid?: any;

          @cormo.Column(['recordid'])
          public recordid_array?: any[];

          @cormo.Column('text')
          public text?: string;

          @cormo.Column('blob')
          public blob?: Buffer;
        }
        models.Type = Type;
      } else {
        models.Type = models.connection.model('Type', {
          boolean: Boolean,
          date: Date,
          int_array: [_g.cormo.types.Integer],
          int_c: _g.cormo.types.Integer,
          bigint_c: _g.cormo.types.BigInteger,
          number: Number,
          object: Object,
          recordid: _g.cormo.types.RecordID,
          recordid_array: [_g.cormo.types.RecordID],
          string: String,
          text: _g.cormo.types.Text,
          blob: _g.cormo.types.Blob,
        });
      }

      await _g.connection.dropAllModels();
    });

    beforeEach(async () => {
      await _g.deleteAllRecords([models.Type]);
    });

    after(async () => {
      await models.connection!.dropAllModels();
      models.connection!.close();
      models.connection = null;
      _g.connection = null;
    });

    describe('#basic', () => {
      cases(models);
    });
    describe('#update', () => {
      cases_update(models);
    });
    describe('#compare', () => {
      cases_compare(models);
    });
    describe('#options', () => {
      cases_options(models);
    });
  });
});
