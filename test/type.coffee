require './common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  describe 'type-' + db, ->
    before (done) ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      if _g.use_coffeescript_class
        class Type extends _g.Model
          @column 'number', 'number'
          @column 'int_c', 'integer'
          @column 'date', 'date'
          @column 'boolean', 'boolean'
          @column 'object', 'object'
          @column 'string', 'string'
          @column 'int_array', ['integer']
          @column 'recordid_array', ['recordid']
      else
        Type = _g.connection.model 'Type',
          number: Number
          int_c: _g.cormo.types.Integer
          date: Date
          boolean: Boolean
          object: Object
          string: String
          int_array: [_g.cormo.types.Integer]
          recordid_array: [_g.cormo.types.RecordID]

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
