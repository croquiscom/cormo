import * as cormo from '../lib/esm/index.js';
import cases, { DocumentRef } from './cases/vector.js';
import _g from './support/common.js';

const _dbs = ['postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('vector-' + db, () => {
    const models = {
      Document: DocumentRef,
      connection: null as cormo.Connection | null,
    };

    before(async () => {
      _g.connection = models.connection = new cormo.Connection(db as any, _g.db_configs[db]);

      @cormo.Model()
      class Document extends _g.BaseModel {
        @cormo.Column('string')
        public name?: string;

        @cormo.Column('vector')
        public embedding?: number[];
      }
      models.Document = Document;

      await _g.connection.dropAllModels();
    });

    beforeEach(async () => {
      await _g.deleteAllRecords([models.Document]);
    });

    after(async () => {
      await models.connection!.dropAllModels();
      models.connection!.close();
      models.connection = null;
      _g.connection = null;
    });

    cases(models);
  });
});
