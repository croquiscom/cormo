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
        global.connection = new Connection db, _dbs[db]

        if Math.floor Math.random() * 2
          # using CoffeeScript extends keyword
          class User extends Model
            @column 'name', { type: String, required: true }
            @column 'age', { type: Number, required: true }
            @column 'email', { type: String, unique: true, required: true }
            @column 'facebook_id', { type: String, unique: true }
        else
          # using Connection method
          User = connection.model 'User',
            name: { type: String, required: true }
            age: { type: Number, required: true }
            email: { type: String, unique: true, required: true }
            facebook_id: { type: String, unique: true }

        dropModels [User], done

      beforeEach (done) ->
        deleteAllRecords [connection.User], done

      after (done) ->
        dropModels [connection.User], done

      require('./cases/constraint')()

    describe '#multicolumn', ->
      before (done) ->
        global.connection = new Connection db, _dbs[db]

        if Math.floor Math.random() * 2
          # using CoffeeScript extends keyword
          class Version extends Model
            @column 'major', 'number'
            @column 'minor', 'number'
            @index { major: 1, minor: 1 }, { unique: true }
        else
          # using Connection method
          Version = connection.model 'Version',
            major: Number
            minor: Number
          Version.index { major: 1, minor: 1 }, { unique: true }

        dropModels [Version], done

      beforeEach (done) ->
        deleteAllRecords [connection.Version], done

      after (done) ->
        dropModels [connection.Version], done

      require('./cases/constraint_multicolumn')()
