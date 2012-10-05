DBConnection = require('../index').DBConnection

_dbs =
  mysql:
    database: 'test'
  mongodb:
    database: 'test'

Object.keys(_dbs).forEach (db) ->
  describe 'query-' + db, ->
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

        User = models.User = connection.model 'User',
          name: String
          age: Number

        User.drop (error) ->
          return done error if error
          connection.applySchemas (error) ->
            return done error if error
            done null

    beforeEach (done) ->
      models.User.deleteAll (error) ->
        return done error if error
        done null

    after (done) ->
      models.User.drop done

    require('./cases/query')(models)