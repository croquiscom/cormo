_g = require './support/common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'integrity-' + db, ->
    before ->
      _g.connection = new _g.Connection db, _g.db_configs[db]
      return

    beforeEach ->
      class Team extends _g.BaseModel
        @column 'name', String
      class Event extends _g.BaseModel
        @column 'time', Date
      class Comment extends _g.BaseModel
        @column 'content', String
      await _g.connection.dropAllModels()
      return

    after ->
      await _g.connection.dropAllModels()
      _g.connection.close()
      _g.connection = null
      return

    require('./cases/integrity')()
