require './common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  describe 'promise-' + db, ->
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

      _g.dropModels [User], done

    beforeEach (done) ->
      _g.deleteAllRecords [_g.connection.User], done

    after (done) ->
      _g.dropModels [_g.connection.User], ->
        _g.connection.close()
        _g.connection = null
        done null

    require('./cases/promise')()
