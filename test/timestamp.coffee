require './common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  describe 'timestamp-' + db, ->
    before (done) ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      if Math.floor Math.random() * 2
        # using CoffeeScript extends keyword
        class User extends _g.Model
          @column 'name', String
          @column 'age', Number
          @timestamps()
      else
        # using Connection method
        User = _g.connection.model 'User',
          name: String
          age: Number
        User.timestamps()

      _g.dropModels [User], done

    beforeEach (done) ->
      _g.deleteAllRecords [_g.connection.User], done

    after (done) ->
      _g.dropModels [_g.connection.User], ->
        _g.connection.close()
        _g.connection = null
        done null

    require('./cases/timestamp')()
