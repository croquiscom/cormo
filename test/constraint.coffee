require './common'

_dbs =
  mysql:
    database: 'test'
  mongodb:
    database: 'test'
  sqlite3:
    database: __dirname + '/test.sqlite3'
  sqlite3_memory: {}
  postgresql:
    database: 'test'

Object.keys(_dbs).forEach (db) ->
  describe 'constraint-' + db, ->
    describe '#basic', ->
      before (done) ->
        _g.connection = new _g.Connection db, _dbs[db]

        if Math.floor Math.random() * 2
          # using CoffeeScript extends keyword
          class User extends _g.Model
            @column 'name', { type: String, required: true }
            @column 'age', { type: Number, required: true }
            @column 'email', { type: String, unique: true, required: true }
            @column 'facebook_id', { type: String, unique: true }

          class Post extends _g.Model
            @column 'title', String
            @column 'body', String
            @belongsTo 'user', required: true
        else
          # using Connection method
          User = _g.connection.model 'User',
            name: { type: String, required: true }
            age: { type: Number, required: true }
            email: { type: String, unique: true, required: true }
            facebook_id: { type: String, unique: true }

          Post = _g.connection.model 'Post',
            title: String
            body: String
          Post.belongsTo User, required: true

        _g.dropModels [User, Post], done

      beforeEach (done) ->
        _g.deleteAllRecords [_g.connection.User, _g.connection.Post], done

      after (done) ->
        _g.dropModels [_g.connection.User, _g.connection.Post], ->
          _g.connection.close()
          _g.connection = null
          done null

      require('./cases/constraint')()

    describe '#multicolumn', ->
      before (done) ->
        _g.connection = new _g.Connection db, _dbs[db]

        if Math.floor Math.random() * 2
          # using CoffeeScript extends keyword
          class Version extends _g.Model
            @column 'major', 'number'
            @column 'minor', 'number'
            @index { major: 1, minor: 1 }, { unique: true }
        else
          # using Connection method
          Version = _g.connection.model 'Version',
            major: Number
            minor: Number
          Version.index { major: 1, minor: 1 }, { unique: true }

        _g.dropModels [Version], done

      beforeEach (done) ->
        _g.deleteAllRecords [_g.connection.Version], done

      after (done) ->
        _g.dropModels [_g.connection.Version], ->
          _g.connection.close()
          _g.connection = null
          done null

      require('./cases/constraint_multicolumn')()
