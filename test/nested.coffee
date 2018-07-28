_g = require './support/common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'nested-' + db, ->
    beforeEach ->
      _g.connection = new _g.Connection db, _g.db_configs[db]
      class User extends _g.Model
        @connection _g.connection
      await _g.connection.dropAllModels()
      return

    afterEach ->
      await _g.connection.dropAllModels()
      _g.connection.close()
      _g.connection = null
      return

    require('./cases/nested')()
