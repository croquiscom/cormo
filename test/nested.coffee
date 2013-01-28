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
    models = {}

    beforeEach (done) ->
      global.connection = new Connection db, _dbs[db]
      class User extends Model
        @connection connection
      models.User = User
      dropModels [models.User], done

    after (done) ->
      dropModels [models.User], done

    require('./cases/nested')(models)
