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
  describe 'type-' + db, ->
    connection = undefined
    connect = (callback) ->
      connection = new Connection db, _dbs[db]
      if connection.connected
        callback()
      else
        connection.once 'connected', callback
        connection.once 'error', (error) ->
          callback error

    models = {}

    before (done) ->
      connect (error) ->
        return done error if error

        if Math.floor Math.random() * 2
          # using CoffeeScript extends keyword
          class Type extends Model
            @connection connection
            @column 'number', 'number'
            @column 'int_c', 'integer'
            @column 'date', 'date'
            @column 'boolean', 'boolean'
            @column 'object', 'object'
            @column 'string', 'string'
        else
          # using Connection method
          Type = connection.model 'Type',
            number: Number
            int_c: cormo.types.Integer
            date: Date
            boolean: Boolean
            object: Object
            string: String

        models.Type = Type

        Type.drop (error) ->
          return done error if error
          done null

    beforeEach (done) ->
      models.Type.deleteAll (error) ->
        return done error if error
        done null

    after (done) ->
      models.Type.drop done

    require('./cases/type')(models)
    require('./cases/type_update')(models)
    require('./cases/type_compare')(models)
