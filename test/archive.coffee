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
      _g.connection = new _g.Connection db, _dbs[db]

      class User extends _g.Model
        @column 'name', String
        @column 'age', Number
        @hasMany 'posts', integrity: 'delete'
        @archive: true

      class Post extends _g.Model
        @column 'title', String
        @column 'body', String
        @belongsTo 'user'
        @archive: true

      _g.dropModels [Post, User], done

    beforeEach (done) ->
      _g.deleteAllRecords [_g.connection._Archive, _g.connection.Post, _g.connection.User], done

    after (done) ->
      _g.dropModels [_g.connection._Archive, _g.connection.Post, _g.connection.User], done

    require('./cases/archive')()
