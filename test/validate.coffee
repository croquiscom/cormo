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
  redis:
    database: 1

Object.keys(_dbs).forEach (db) ->
  describe 'validate-' + db, ->
    models = {}

    before (done) ->
      global.connection = new Connection db, _dbs[db]

      if Math.floor Math.random() * 2
        # using CoffeeScript extends keyword
        class User extends Model
          @column 'name', String
          @column 'age', Number
          @column 'email', String
      else
        # using Connection method
        User = connection.model 'User',
          name: String
          age: Number
          email: String

      models.User = User

      # checkes age validity
      User.addValidator (record) ->
        if record.age < 18
          return 'too young'
        
      # checkes email validity
      User.addValidator (record) ->
        if record.email and not /^\w+@.+$/.test record.email
          throw new Error 'invalid email'
        return true

      dropModels [models.User], done

    beforeEach (done) ->
      deleteAllRecords [models.User], done

    after (done) ->
      dropModels [models.User], done

    require('./cases/validate')(models)
