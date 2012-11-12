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
  describe 'nested-' + db, ->
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
      connect done

    beforeEach (done) ->
      class User extends Model
        @connection connection
      models.connection = connection
      models.User = User
      User.drop (error) ->
        return done error if error
        done null

    after (done) ->
      models.User.drop done

    require('./cases/nested')(models)
