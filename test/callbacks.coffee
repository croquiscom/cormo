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
  describe 'callbacks-' + db, ->
    connection = new Connection db, _dbs[db]
    models = {}

    beforeEach (done) ->
      class User extends Model
        @connection connection
        @column 'name', String
        @column 'age', Number
      models.User = User
      dropModels [models.User], done

    after (done) ->
      dropModels [models.User], done

    require('./cases/callbacks')(models)
