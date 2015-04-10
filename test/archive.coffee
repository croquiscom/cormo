_g = require './support/common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'archive-' + db, ->
    before (done) ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

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

      _g.connection.dropAllModels done

    beforeEach (done) ->
      _g.deleteAllRecords [_g.connection._Archive, _g.connection.Post, _g.connection.User], done

    after (done) ->
      _g.connection.dropAllModels ->
        _g.connection.close()
        _g.connection = null
        done null

    require('./cases/archive')()
