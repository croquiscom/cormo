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
    before (done) ->
      _g.connection = new _g.Connection db, _dbs[db]

      if Math.floor Math.random() * 2
        # using CoffeeScript extends keyword
        class Type extends _g.Model
          @column 'number', 'number'
          @column 'int_c', 'integer'
          @column 'date', 'date'
          @column 'boolean', 'boolean'
          @column 'object', 'object'
          @column 'string', 'string'
          @column 'int_array', ['integer']
      else
        # using Connection method
        Type = _g.connection.model 'Type',
          number: Number
          int_c: _g.cormo.types.Integer
          date: Date
          boolean: Boolean
          object: Object
          string: String
          int_array: [_g.cormo.types.Integer]

      _g.dropModels [Type], done

    beforeEach (done) ->
      _g.deleteAllRecords [_g.connection.Type], done

    after (done) ->
      _g.dropModels [_g.connection.Type], ->
        _g.connection.close()
        _g.connection = null
        done null

    describe '#basic', ->
      require('./cases/type')()
    describe '#update', ->
      require('./cases/type_update')()
    describe '#compare', ->
      require('./cases/type_compare')()
