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
    connection = new Connection db, _dbs[db]
    models = {}

    describe '#basic', ->
      before (done) ->
        if Math.floor Math.random() * 2
          # using CoffeeScript extends keyword
          class User extends Model
            @connection connection
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

        models.User = User

        dropModels [models.User], done

      beforeEach (done) ->
        deleteAllRecords [models.User], done

      after (done) ->
        dropModels [models.User], (error) ->
          delete models.User
          done error

      require('./cases/constraint')(models)

    describe '#multicolumn', ->
      before (done) ->
        if Math.floor Math.random() * 2
          # using CoffeeScript extends keyword
          class Version extends Model
            @connection connection
            @column 'major', 'number'
            @column 'minor', 'number'
            @index { major: 1, minor: 1 }, { unique: true }
        else
          # using Connection method
          Version = connection.model 'User',
            major: Number
            minor: Number
          Version.index { major: 1, minor: 1 }, { unique: true }

        models.Version = Version

        dropModels [models.Version], done

      beforeEach (done) ->
        deleteAllRecords [models.Version], done

      after (done) ->
        dropModels [models.Version], (error) ->
          delete models.Version
          done error

      require('./cases/constraint_multicolumn')(models)
