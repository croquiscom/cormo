_g = require './support/common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'callbacks-' + db, ->
    beforeEach ->
      _g.connection = new _g.Connection db, _g.db_configs[db]
      class User extends _g.Model
        @column 'name', String
        @column 'age', Number
      await _g.connection.dropAllModels()
      return

    after ->
      await _g.connection.dropAllModels()
      _g.connection.close()
      _g.connection = null
      return

    require('./cases/callbacks')()
