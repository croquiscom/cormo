_g = require './common'

_dbs = [ 'mysql', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'adapter-' + db, ->
    before (done) ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      _g.connection.dropAllModels done

    afterEach (done) ->
      _g.connection.dropAllModels done

    after ->
      _g.connection.close()
      _g.connection = null

    require('./cases/adapter-'+db)()
