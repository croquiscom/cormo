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
    beforeEach (done) ->
      global.connection = new Connection db, _dbs[db]
      class User extends Model
        @column 'name', String
        @column 'age', Number
      dropModels [User], done

    after (done) ->
      dropModels [connection.User], done

    require('./cases/callbacks')()
