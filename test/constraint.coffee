DBConnection = require('../index').DBConnection

_dbs =
  mysql:
    database: 'test'
  mongodb:
    database: 'test'

Object.keys(_dbs).forEach (db) ->
  describe 'constraint-' + db, ->
    connection = undefined
    connect = (callback) ->
      connection = new DBConnection db, _dbs[db]
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

        User = models.User = connection.model 'User',
          name: { type: String, required: true }
          age: { type: Number, required: true }
          email: { type: String, unique: true, required: true }
          facebook_id: { type: String, unique: true }

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

    require('./cases/constraint')(models)
