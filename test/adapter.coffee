_g = require './support/common'

_dbs = [ 'mysql', 'mongodb', 'postgresql', 'sqlite3' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'adapter-' + db, ->
    before ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      await _g.connection.dropAllModels()
      return

    afterEach ->
      await _g.connection.dropAllModels()
      return

    after ->
      _g.connection.close()
      _g.connection = null

    require('./cases/adapter-'+db)()
