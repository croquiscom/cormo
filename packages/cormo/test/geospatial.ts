import { expect } from 'chai';
import * as cormo from '../src/index.js';
import cases, { PlaceRef } from './cases/geospatial.js';
import _g from './support/common.js';

const _dbs = ['mysql', 'mongodb', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('geospatial-' + db, () => {
    const models = {
      Place: PlaceRef,
      connection: null as cormo.Connection | null,
    };

    before(async () => {
      _g.connection = models.connection = new cormo.Connection(db as any, _g.db_configs[db]);

      @cormo.Model()
      class Place extends _g.BaseModel {
        @cormo.Column('string')
        public name?: string;

        @cormo.Column('geopoint')
        public location: any;
      }
      models.Place = Place;

      await _g.connection.dropAllModels();
    });

    beforeEach(async () => {
      await _g.deleteAllRecords([models.Place]);
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

const _dbs_not = ['sqlite3', 'sqlite3_memory'];

_dbs_not.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('geospatial-' + db, () => {
    before(() => {
      _g.connection = new cormo.Connection(db as any, _g.db_configs[db]);
    });

    it('does not support geospatial', () => {
      expect(() => {
        _g.connection!.model('Place', {
          name: String,
          location: cormo.types.GeoPoint,
        });
      }).to.throw('this adapter does not support GeoPoint type');
    });
  });
});
