_g = require './support/common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'timestamp-' + db, ->
    before ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      if _g.use_coffeescript_class
        class User extends _g.BaseModel
          @column 'name', String
          @column 'age', Number
          @timestamps()
      else
        User = _g.connection.model 'User',
          name: String
          age: Number
        User.timestamps()

      await _g.connection.dropAllModels()
      return

    beforeEach ->
      await _g.deleteAllRecords [_g.connection.User]
      return

    after ->
      await _g.connection.dropAllModels()
      _g.connection.close()
      _g.connection = null
      return

    require('./cases/timestamp')()
