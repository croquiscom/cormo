_g = require './support/common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'aggregation-' + db, ->
    before ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      if _g.use_coffeescript_class
        class Order extends _g.BaseModel
          @column 'customer', String
          @column 'date', Date
          @column 'price', Number
      else
        Order = _g.connection.model 'Order',
          customer: String
          date: Date
          price: Number

      await _g.connection.dropAllModels()
      return

    beforeEach ->
      await _g.connection.manipulate [
        'deleteAll'
        { create_order: customer: 'John Doe', date: '2012/01/01', price: 20 }
        { create_order: customer: 'John Doe', date: '2012/01/01', price: 11 }
        { create_order: customer: 'John Doe', date: '2012/09/23', price: 3 }
        { create_order: customer: 'John Doe', date: '2012/12/07', price: 15 }
        { create_order: customer: 'Bill Smith', date: '2012/02/03', price: 60 }
        { create_order: customer: 'Bill Smith', date: '2012/02/03', price: 16 }
        { create_order: customer: 'Daniel Smith', date: '2012/01/19', price: 6 }
        { create_order: customer: 'Daniel Smith', date: '2012/04/23', price: 13 }
        { create_order: customer: 'Daniel Smith', date: '2012/04/23', price: 11 }
      ]
      return

    after ->
      await _g.connection.dropAllModels()
      _g.connection.close()
      _g.connection = null
      return

    require('./cases/aggregation')()
