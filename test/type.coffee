_g = require './support/common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'type-' + db, ->
    before ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      if _g.use_coffeescript_class
        class Type extends _g.BaseModel
          @column 'number', 'number'
          @column 'int_c', 'integer'
          @column 'date', 'date'
          @column 'boolean', 'boolean'
          @column 'object', 'object'
          @column 'string', 'string'
          @column 'int_array', ['integer']
          @column 'recordid_array', ['recordid']
          @column 'text', 'text'
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
          text : _g.cormo.types.Text

      await _g.connection.dropAllModels()
      return

    beforeEach ->
      await _g.deleteAllRecords [_g.connection.Type]
      return

    after ->
      await _g.connection.dropAllModels()
      _g.connection.close()
      _g.connection = null
      return

    describe '#basic', ->
      require('./cases/type')()
    describe '#update', ->
      require('./cases/type_update')()
    describe '#compare', ->
      require('./cases/type_compare')()
    describe '#options', ->
      require('./cases/type_options')()
