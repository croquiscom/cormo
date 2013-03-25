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
  describe 'archive-' + db, ->
    before (done) ->
      global.connection = new Connection db, _dbs[db]

      class User extends Model
        @column 'name', String
        @column 'age', Number
        @hasMany 'posts', integrity: 'delete'
        @archive: true

      class Post extends Model
        @column 'title', String
        @column 'body', String
        @belongsTo 'user'
        @archive: true

      dropModels [Post, User], done

    beforeEach (done) ->
      deleteAllRecords [connection._Archive, connection.Post, connection.User], done

    after (done) ->
      dropModels [connection._Archive, connection.Post, connection.User], done

    require('./cases/archive')()
