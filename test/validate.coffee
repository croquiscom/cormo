DBConnection = require('../index').DBConnection

_dbs =
  mysql:
    database: 'test'
  mongodb:
    database: 'test'
  sqlite3:
    database: __dirname + '/test.sqlite3'

Object.keys(_dbs).forEach (db) ->
  describe 'validate-' + db, ->
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
          name: String
          age: Number
          email: String

        # checkes age validity
        User.addValidator (record) ->
          if record.age < 18
            return 'too young'
          
        # checkes email validity
        User.addValidator (record) ->
          if record.email and not /^\w+@.+$/.test record.email
            throw new Error 'invalid email'
          return true

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

    require('./cases/validate')(models)
