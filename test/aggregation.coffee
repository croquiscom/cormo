require './common'

_dbs =
  mysql:
    database: 'test'
  mongodb:
    database: 'test'
  sqlite3:
    database: __dirname + '/test.sqlite3'
  sqlite3_memory: {}
  postgresql:
    database: 'test'

Object.keys(_dbs).forEach (db) ->
  describe 'aggregation-' + db, ->
    before (done) ->
      _g.connection = new _g.Connection db, _dbs[db]

      if Math.floor Math.random() * 2
        # using CoffeeScript extends keyword
        class Order extends _g.Model
          @column 'customer', String
          @column 'date', Date
          @column 'price', Number
      else
        # using Connection method
        Order = _g.connection.model 'Order',
          customer: String
          date: Date
          price: Number

      _g.dropModels [Order], done

    beforeEach (done) ->
      _g.connection.manipulate [
        'deleteAll'
        { create_order: customer: 'John Doe', date: '2012/01/01', price: 20 }
        { create_order: customer: 'John Doe', date: '2012/04/11', price: 11 }
        { create_order: customer: 'John Doe', date: '2012/09/23', price: 3 }
        { create_order: customer: 'John Doe', date: '2012/12/07', price: 15 }
        { create_order: customer: 'Bill Smith', date: '2012/02/03', price: 60 }
        { create_order: customer: 'Bill Smith', date: '2012/04/12', price: 16 }
        { create_order: customer: 'Daniel Smith', date: '2012/01/19', price: 6 }
        { create_order: customer: 'Daniel Smith', date: '2012/04/23', price: 13 }
        { create_order: customer: 'Daniel Smith', date: '2012/10/09', price: 11 }
      ], done

    after (done) ->
      _g.dropModels [_g.connection.Order], done

    require('./cases/aggregation')()
