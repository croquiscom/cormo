import * as cormo from '..';
import cases, { Order as OrderRef } from './cases/aggregation';
import _g = require('./support/common');

const _dbs = ['mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql'];

_dbs.forEach((db) => {
  if (!_g.db_configs[db]) {
    return;
  }

  describe('aggregation-' + db, () => {
    const models = {
      Order: OrderRef,
      connection: null as cormo.Connection | null,
    };

    before(async () => {
      _g.connection = models.connection = new cormo.Connection(db as any, _g.db_configs[db]);
      if (_g.use_class) {
        @cormo.Model()
        class Order extends cormo.BaseModel {
          @cormo.Column(String)
          public customer!: string;

          @cormo.Column(Date)
          public date?: Date;

          @cormo.Column(Number)
          public price?: number;
        }
        models.Order = Order;
      } else {
        models.Order = models.connection.model('Order', {
          customer: String,
          date: Date,
          price: Number,
        }) as typeof models.Order;
      }

      await _g.connection.dropAllModels();
    });

    beforeEach(async () => {
      await models.connection!.manipulate([
        'deleteAll',
        { create_order: { customer: 'John Doe', date: '2012/01/01', price: 20 } },
        { create_order: { customer: 'John Doe', date: '2012/01/01', price: 11 } },
        { create_order: { customer: 'John Doe', date: '2012/09/23', price: 3 } },
        { create_order: { customer: 'John Doe', date: '2012/12/07', price: 15 } },
        { create_order: { customer: 'Bill Smith', date: '2012/02/03', price: 60 } },
        { create_order: { customer: 'Bill Smith', date: '2012/02/03', price: 16 } },
        { create_order: { customer: 'Daniel Smith', date: '2012/01/19', price: 6 } },
        { create_order: { customer: 'Daniel Smith', date: '2012/04/23', price: 13 } },
        { create_order: { customer: 'Daniel Smith', date: '2012/04/23', price: 11 } },
      ]);
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
