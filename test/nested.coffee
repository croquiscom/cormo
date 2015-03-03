_g = require './common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'nested-' + db, ->
    beforeEach (done) ->
      _g.connection = new _g.Connection db, _g.db_configs[db]
      class User extends _g.Model
        @connection _g.connection
      _g.dropModels [User], done

    afterEach (done) ->
      _g.dropModels [_g.connection.User], ->
        _g.connection.close()
        _g.connection = null
        done null

    require('./cases/nested')()
