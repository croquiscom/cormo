_g = require './support/common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'query-' + db, ->
    before ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      if _g.use_coffeescript_class
        class User extends _g.BaseModel
          @column 'name', String
          @column 'age', Number
        class UserUnique extends _g.BaseModel
          @column 'name', type: String, unique: true
          @column 'age', Number
      else
        User = _g.connection.model 'User',
          name: String
          age: Number
        UserUnique = _g.connection.model 'UserUnique',
          name: type: String, unique: true
          age: Number

      await _g.connection.dropAllModels()
      return

    beforeEach ->
      await _g.deleteAllRecords [_g.connection.User,_g.connection.UserUnique]
      return

    after ->
      await _g.connection.dropAllModels()
      _g.connection.close()
      _g.connection = null
      return

    describe '#simple', ->
      require('./cases/query')()
    describe '#$not', ->
      require('./cases/query_not')()
    describe '#null', ->
      require('./cases/query_null')()
    describe '#update', ->
      require('./cases/query_update')()
    describe '#upsert', ->
      require('./cases/query_upsert')()
    describe '#stream', ->
      require('./cases/query_stream')()
