_g = require './support/common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'constraint-' + db, ->
    describe '#basic', ->
      before ->
        _g.connection = new _g.Connection db, _g.db_configs[db]

        if _g.use_class
          class User extends _g.BaseModel
            @column 'name', { type: String, required: true }
            @column 'age', { type: Number, required: true }
            @column 'email', { type: String, unique: true, required: true }
            @column 'facebook_id', { type: String, unique: true }

          class Post extends _g.BaseModel
            @column 'title', String
            @column 'body', String
            @belongsTo 'user', required: true
        else
          User = _g.connection.model 'User',
            name: { type: String, required: true }
            age: { type: Number, required: true }
            email: { type: String, unique: true, required: true }
            facebook_id: { type: String, unique: true }

          Post = _g.connection.model 'Post',
            title: String
            body: String
          Post.belongsTo User, required: true

        await _g.connection.dropAllModels()
        return

      beforeEach ->
        await _g.deleteAllRecords [_g.connection.User, _g.connection.Post]
        return

      after ->
        await _g.connection.dropAllModels()
        _g.connection.close()
        _g.connection = null
        return

      require('./cases/constraint')()

    describe '#multicolumn', ->
      before ->
        _g.connection = new _g.Connection db, _g.db_configs[db]

        if _g.use_class
          class Version extends _g.BaseModel
            @column 'major', 'number'
            @column 'minor', 'number'
            @index { major: 1, minor: 1 }, { unique: true }
        else
          Version = _g.connection.model 'Version',
            major: Number
            minor: Number
          Version.index { major: 1, minor: 1 }, { unique: true }

        await _g.connection.dropAllModels()
        return

      beforeEach ->
        await _g.deleteAllRecords [_g.connection.Version]
        return

      after ->
        await _g.connection.dropAllModels()
        _g.connection.close()
        _g.connection = null
        return

      require('./cases/constraint_multicolumn')()
