_g = require './support/common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql', 'redis' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'validate-' + db, ->
    before ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      if _g.use_coffeescript_class
        class User extends _g.Model
          @column 'name', String
          @column 'age', Number
          @column 'email', String
      else
        User = _g.connection.model 'User',
          name: String
          age: Number
          email: String

      # checkes age validity
      User.addValidator (record) ->
        if record.age < 18
          return 'too young'
        
      # checkes email validity
      User.addValidator (record) ->
        if record.email and not /^\w+@.+$/.test record.email
          throw new Error 'invalid email'
        return true

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

    require('./cases/validate')()
