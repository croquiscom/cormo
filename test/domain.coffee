_g = require './support/common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'domain-' + db, ->
    before (done) ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      if _g.use_coffeescript_class
        class User extends _g.Model
          @column 'name', String
          @column 'age', Number
      else
        User = _g.connection.model 'User',
          name: String
          age: Number

      _g.connection.dropAllModels done
      return

    beforeEach (done) ->
      _g.deleteAllRecords [_g.connection.User], done
      return

    after (done) ->
      _g.connection.dropAllModels ->
        _g.connection.close()
        _g.connection = null
        done null
      return

    require('./cases/domain')()
