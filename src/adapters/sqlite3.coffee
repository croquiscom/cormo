try
  sqlite3 = require 'sqlite3'
catch e
  console.log 'Install sqlite3 module to use this adapter'
  process.exit 1

SQLAdapterBase = require './sql_base'
types = require '../types'
async = require 'async'
_ = require 'lodash'
stream = require 'stream'

_typeToSQL = (property) ->
  if property.array
    return 'TEXT'
  switch property.type_class
    when types.String then 'TEXT'
    when types.Number then 'DOUBLE'
    when types.Boolean then 'TINYINT'
    when types.Integer then 'INT'
    when types.Date then 'REAL'
    when types.Object then 'TEXT'

_propertyToSQL = (property) ->
  type = _typeToSQL property
  if type
    if property.required
      type += ' NOT NULL'
    else
      type += ' NULL'
    return type

##
# Adapter for SQLite3
# @namespace adapter
class SQLite3Adapter extends SQLAdapterBase
  key_type: types.Integer
  native_integrity: true
  _regexp_op: null
  _false_value: '0'

  ##
  # Creates a SQLite3 adapter
  constructor: (connection) ->
    @_connection = connection

  _query: (method, sql, data, callback) ->
    #console.log 'SQLite3Adapter:', sql
    @_client[method].apply @_client, [].slice.call arguments, 1

  _getTables: (callback) ->
    @_query 'all', "SELECT name FROM sqlite_master WHERE type='table'", (error, tables) =>
      return callback error if error
      tables = tables.map (table) ->
        table.name
      callback null, tables

  _getSchema: (table, callback) ->
    @_query 'all', "PRAGMA table_info(`#{table}`)", (error, columns) ->
      return callback error if error
      schema = {}
      for column in columns
        type = if /^varchar\((\d*)\)/i.test column.type
          new types.String(RegExp.$1)
        else if /^double/i.test column.type
          new types.Number()
        else if /^tinyint/i.test column.type
          new types.Boolean()
        else if /^int/i.test column.type
          new types.Integer()
        else if /^real/i.test column.type
          new types.Date()
        else if /^text/i.test column.type
          new types.Object()
        schema[column.name] = type: type, required: column.notnull is 1
      callback null, schema

  ## @override AdapterBase::getSchemas
  getSchemas: (callback) ->
    async.auto
      get_tables: (callback) =>
        @_getTables callback
      get_table_schemas: ['get_tables', (callback, results) =>
        table_schemas = {}
        async.each results.get_tables, (table, callback) =>
          @_getSchema table, (error, schema) ->
            return callback error if error
            table_schemas[table] = schema
            callback null
        , (error) ->
          return callback error if error
          callback null, table_schemas
      ]
    , (error, results) ->
      callback error, tables: results.get_table_schemas

  ## @override AdapterBase::createTable
  createTable: (model, callback) ->
    model_class = @_connection.models[model]
    tableName = model_class.tableName
    sql = []
    sql.push 'id INTEGER PRIMARY KEY AUTOINCREMENT'
    for column, property of model_class._schema
      column_sql = _propertyToSQL property
      if column_sql
        sql.push "\"#{property._dbname}\" #{column_sql}"
    sql = "CREATE TABLE \"#{tableName}\" ( #{sql.join ','} )"
    @_query 'run', sql, (error, result) =>
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      callback null

  ## @override AdapterBase::drop
  drop: (model, callback) ->
    tableName = @_connection.models[model].tableName
    @_query 'run', "DROP TABLE IF EXISTS \"#{tableName}\"", (error) ->
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      callback null

  _getModelID: (data) ->
    Number data.id

  valueToModel: (value, property) ->
    if property.type_class is types.Object or property.array
      JSON.parse value
    else if property.type_class is types.Date
      new Date value
    else if property.type_class is types.Boolean
      value isnt 0
    else
      value

  _processSaveError = (error, callback) ->
    if /no such table/.test error.message
      error = new Error('table does not exist')
    else if error.code is 'SQLITE_CONSTRAINT'
      error = new Error('duplicated')
    else
      error = SQLite3Adapter.wrapError 'unknown error', error
    callback error

  _buildUpdateSetOfColumn: (property, data, values, fields, places, insert) ->
    dbname = property._dbname
    value = data[dbname]
    if value?.$inc
      values.push value.$inc
      fields.push "\"#{dbname}\"=\"#{dbname}\"+?"
    else
      if property.type_class is types.Date
        values.push value?.getTime()
      else
        values.push value
      if insert
        fields.push "\"#{dbname}\""
        places.push '?'
      else
        fields.push "\"#{dbname}\"=?"

  _buildUpdateSet: (model, data, values, insert) ->
    schema = @_connection.models[model]._schema
    fields = []
    places = []
    for column, property of schema
      @_buildUpdateSetOfColumn property, data, values, fields, places, insert
    [ fields.join(','), places.join(',') ]

  _buildPartialUpdateSet: (model, data, values) ->
    schema = @_connection.models[model]._schema
    fields = []
    places = []
    for column, value of data
      property = _.find schema, (item) -> return item._dbname is column
      @_buildUpdateSetOfColumn property, data, values, fields, places
    [ fields.join(','), places.join(',') ]

  ## @override AdapterBase::create
  create: (model, data, callback) ->
    tableName = @_connection.models[model].tableName
    values = []
    [ fields, places ] = @_buildUpdateSet model, data, values, true
    sql = "INSERT INTO \"#{tableName}\" (#{fields}) VALUES (#{places})"
    @_query 'run', sql, values, (error) ->
      return _processSaveError error, callback if error
      callback null, @lastID

  ## @override AdapterBase::createBulk
  createBulk: (model, data, callback) ->
    tableName = @_connection.models[model].tableName
    values = []
    fields = undefined
    places = []
    data.forEach (item) =>
      [ fields, places_sub ] = @_buildUpdateSet model, item, values, true
      places.push '(' + places_sub + ')'
    sql = "INSERT INTO \"#{tableName}\" (#{fields}) VALUES #{places.join ','}"
    @_query 'run', sql, values, (error) ->
      return _processSaveError error, callback if error
      if id = @lastID
        id = id - data.length + 1
        callback null, data.map (item, i) -> id + i
      else
        callback new Error 'unexpected result'

  ## @override AdapterBase::update
  update: (model, data, callback) ->
    tableName = @_connection.models[model].tableName
    values = []
    [ fields ] = @_buildUpdateSet model, data, values
    values.push data.id
    sql = "UPDATE \"#{tableName}\" SET #{fields} WHERE id=?"
    @_query 'run', sql, values, (error) ->
      return _processSaveError error, callback if error
      callback null

  ## @override AdapterBase::updatePartial
  updatePartial: (model, data, conditions, options, callback) ->
    tableName = @_connection.models[model].tableName
    values = []
    [ fields ] = @_buildPartialUpdateSet model, data, values
    sql = "UPDATE \"#{tableName}\" SET #{fields}"
    if conditions.length > 0
      try
        sql += ' WHERE ' + @_buildWhere @_connection.models[model]._schema, conditions, values
      catch e
        return callback e
    @_query 'run', sql, values, (error) ->
      return _processSaveError error, callback if error
      callback null, @changes

  ## @override AdapterBase::findById
  findById: (model, id, options, callback) ->
    select = @_buildSelect @_connection.models[model], options.select
    tableName = @_connection.models[model].tableName
    sql = "SELECT #{select} FROM \"#{tableName}\" WHERE id=? LIMIT 1"
    if options.explain
      return @_query 'all', "EXPLAIN QUERY PLAN #{sql}", id, (error, result) ->
        return callback error if error
        callback null, result
    @_query 'all', sql, id, (error, result) =>
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      if result?.length is 1
        if options.lean
          callback null, @_refineRawInstance model, result[0], options.select, options.select_raw
        else
          callback null, @_convertToModelInstance model, result[0], options.select, options.select_raw
      else if result?.length > 1
        callback new Error 'unknown error'
      else
        callback new Error 'not found'

  _buildSqlForFind: (model, conditions, options) ->
    if options.group_by or options.group_fields
      select = @_buildGroupFields options.group_by, options.group_fields
    else
      select = @_buildSelect @_connection.models[model], options.select
    tableName = @_connection.models[model].tableName
    params = []
    sql = "SELECT #{select} FROM \"#{tableName}\""
    if conditions.length > 0
      sql += ' WHERE ' + @_buildWhere @_connection.models[model]._schema, conditions, params
    if options.group_by
      sql += ' GROUP BY ' + options.group_by.join ','
    if options.conditions_of_group.length > 0
      sql += ' HAVING ' + @_buildWhere options.group_fields, options.conditions_of_group, params
    if options?.orders.length > 0
      orders = options.orders.map (order) ->
        if order[0] is '-'
          return "\"#{order[1..]}\" DESC"
        else
          return "\"#{order}\" ASC"
      sql += ' ORDER BY ' + orders.join ','
    if options?.limit?
      sql += ' LIMIT ' + options.limit
      sql += ' OFFSET ' + options.skip if options?.skip?
    else if options?.skip?
      sql += ' LIMIT 2147483647 OFFSET ' + options.skip
    #console.log sql, params
    [sql, params]

  ## @override AdapterBase::find
  find: (model, conditions, options, callback) ->
    try
      [sql, params] = @_buildSqlForFind model, conditions, options
    catch e
      return callback e
    if options.explain
      return @_query 'all', "EXPLAIN QUERY PLAN #{sql}", params, (error, result) ->
        return callback error if error
        callback null, result
    @_query 'all', sql, params, (error, result) =>
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      if options.group_fields
        callback null, result.map (record) => @_convertToGroupInstance model, record, options.group_by, options.group_fields
      else
        if options.lean
          callback null, result.map (record) => @_refineRawInstance model, record, options.select, options.select_raw
        else
          callback null, result.map (record) => @_convertToModelInstance model, record, options.select, options.select_raw

  ## @override AdapterBase::stream
  stream: (model, conditions, options) ->
    try
      [sql, params] = @_buildSqlForFind model, conditions, options
    catch e
      readable = new stream.Readable objectMode: true
      readable._read = ->
        readable.emit 'error', e
      return readable
    readable = new stream.Readable objectMode: true
    readable._read = ->
    @_client.each sql, params, (error, record) =>
      return readable.emit 'error', error if error
      readable.push @_convertToModelInstance model, record, options.select, options.select_raw
    , ->
      readable.push null
    readable

  ## @override AdapterBase::count
  count: (model, conditions, options, callback) ->
    params = []
    tableName = @_connection.models[model].tableName
    sql = "SELECT COUNT(*) AS count FROM \"#{tableName}\""
    if conditions.length > 0
      try
        sql += ' WHERE ' + @_buildWhere @_connection.models[model]._schema, conditions, params
      catch e
        return callback e
    if options.group_by
      sql += ' GROUP BY ' + options.group_by.join ','
      if options.conditions_of_group.length > 0
        try
          sql += ' HAVING ' + @_buildWhere options.group_fields, options.conditions_of_group, params
        catch e
          return callback e
      sql = "SELECT COUNT(*) AS count FROM (#{sql})"
    #console.log sql, params
    @_query 'all', sql, params, (error, result) =>
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      return callback new Error 'unknown error' if result?.length isnt 1
      callback null, Number(result[0].count)

  ## @override AdapterBase::delete
  delete: (model, conditions, callback) ->
    params = []
    tableName = @_connection.models[model].tableName
    sql = "DELETE FROM \"#{tableName}\""
    if conditions.length > 0
      try
        sql += ' WHERE ' + @_buildWhere @_connection.models[model]._schema, conditions, params
      catch e
        return callback e
    #console.log sql, params
    @_query 'run', sql, params, (error) ->
      # @ is sqlite3.Statement
      return callback new Error 'rejected' if error and error.code is 'SQLITE_CONSTRAINT'
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      callback null, @changes

  ##
  # Connects to the database
  # @param {Object} settings
  # @param {String} settings.database
  # @nodejscallback
  connect: (settings, callback) ->
    client = new sqlite3.Database settings.database, (error) =>
      return callback SQLite3Adapter.wrapError 'failed to open', error if error

      @_client = client
      @_query 'run', 'PRAGMA foreign_keys=ON', (error) ->
        callback null

  ## @override AdapterBase::close
  close: ->
    if @_client
      @_client.close()
    @_client = null

module.exports = (connection) ->
  new SQLite3Adapter connection
