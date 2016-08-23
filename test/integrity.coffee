_g = require './support/common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'integrity-' + db, ->
    before (done) ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      done null

    beforeEach (done) ->
      class Team extends _g.Model
        @column 'name', String
      class Event extends _g.Model
        @column 'time', Date
      class Comment extends _g.Model
        @column 'content', String
      _g.connection.dropAllModels done
      return

    after (done) ->
      _g.connection.dropAllModels ->
        _g.connection.close()
        _g.connection = null
        done null
      return

    require('./cases/integrity')()
