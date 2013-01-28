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
  describe 'type-' + db, ->
    models = {}

    before (done) ->
      global.connection = new Connection db, _dbs[db]

      if Math.floor Math.random() * 2
        # using CoffeeScript extends keyword
        class Type extends Model
          @column 'number', 'number'
          @column 'int_c', 'integer'
          @column 'date', 'date'
          @column 'boolean', 'boolean'
          @column 'object', 'object'
          @column 'string', 'string'
          @column 'int_array', ['integer']
      else
        # using Connection method
        Type = connection.model 'Type',
          number: Number
          int_c: cormo.types.Integer
          date: Date
          boolean: Boolean
          object: Object
          string: String
          int_array: [cormo.types.Integer]

      models.Type = Type

      dropModels [models.Type], done

    beforeEach (done) ->
      deleteAllRecords [models.Type], done

    after (done) ->
      dropModels [models.Type], done

    describe '#basic', ->
      require('./cases/type')(models)
    describe '#update', ->
      require('./cases/type_update')(models)
    describe '#compare', ->
      require('./cases/type_compare')(models)
