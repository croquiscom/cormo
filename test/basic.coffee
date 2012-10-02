DBConnection = require '../index'

_dbs =
  mysql:
    database: 'test'
  mongodb:
    database: 'test'

Object.keys(_dbs).forEach (db) ->
  describe 'basic-' + db, ->
    connection = undefined
    connect = (callback) ->
      connection = new DBConnection db, _dbs[db]
      if connection.connected
        callback()
      else
        connection.on 'connected', callback
        connection.on 'error', (error) ->
          callback error

    models = {}

    before (done) ->
      connect (error) ->
        return done error if error

        models.User = connection.model 'User',
          name: String
          age: Number

        connection.applySchemas done

    require('./cases/basic')(models)
