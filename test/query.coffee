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
  describe 'query-' + db, ->
    models = {}

    before (done) ->
      global.connection = new Connection db, _dbs[db]

      if Math.floor Math.random() * 2
        # using CoffeeScript extends keyword
        class User extends Model
          @column 'name', String
          @column 'age', Number
      else
        # using Connection method
        User = connection.model 'User',
          name: String
          age: Number

      models.User = User

      dropModels [models.User], done

    beforeEach (done) ->
      deleteAllRecords [models.User], done

    after (done) ->
      dropModels [models.User], done

    describe '#simple', ->
      require('./cases/query')(models)
    describe '#$not', ->
      require('./cases/query_not')(models)
    describe '#update', ->
      require('./cases/query_update')(models)
