_g = require './support/common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'archive-' + db, ->
    before ->
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

      await _g.connection.dropAllModels()
      return

    beforeEach ->
      await _g.deleteAllRecords [_g.connection._Archive, _g.connection.Post, _g.connection.User]
      return

    after ->
      await _g.connection.dropAllModels()
      _g.connection.close()
      _g.connection = null
      return

    require('./cases/archive')()
