_g = require './common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'callbacks-' + db, ->
    beforeEach (done) ->
      _g.connection = new _g.Connection db, _g.db_configs[db]
      class User extends _g.Model
        @column 'name', String
        @column 'age', Number
      _g.dropModels [User], done

    after (done) ->
      _g.dropModels [_g.connection.User], ->
        _g.connection.close()
        _g.connection = null
        done null

    require('./cases/callbacks')()
