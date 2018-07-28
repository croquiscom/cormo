try
  sqlite3 = require 'sqlite3'
catch e
  console.log 'Install sqlite3 module to use this adapter'
  process.exit 1

SQLAdapterBase = require './sql_base'
types = require '../types'
_ = require 'lodash'
stream = require 'stream'
util = require 'util'

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
    when types.Text then 'TEXT'

_propertyToSQL = (property) ->
  type = _typeToSQL property
  if type
    if property.required
      type += ' NOT NULL'
    else
      type += ' NULL'
    return type

_processSaveError = (error) ->
  if /no such table/.test error.message
    return new Error('table does not exist')
  else if error.code is 'SQLITE_CONSTRAINT'
    return new Error('duplicated')
  else
    return SQLite3Adapter.wrapError 'unknown error', error

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
    super()
    @_connection = connection

  _getTables: ->
    tables = await @_client.allAsync "SELECT name FROM sqlite_master WHERE type='table'"
    tables = tables.map (table) ->
      table.name
    tables

  _getSchema: (table) ->
    columns = await @_client.allAsync "PRAGMA table_info(`#{table}`)"
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
    schema

  _getIndexes: (table) ->
    rows = await @_client.allAsync "PRAGMA index_list(`#{table}`)"
    indexes = {}
    for row in rows
      indexes[row.name] or= {}
      columns = await @_client.allAsync "PRAGMA index_info(`#{row.name}`)"
      for column in columns
        indexes[row.name][column.name] = 1
    indexes

  ## @override AdapterBase::getSchemas
  getSchemas: () ->
    tables = await @_getTables()
    table_schemas = {}
    all_indexes = {}
    for table in tables
      table_schemas[table] = await @_getSchema table
      all_indexes[table] = await @_getIndexes table
    return tables: table_schemas, indexes: all_indexes

  ## @override AdapterBase::createTable
  createTable: (model) ->
    model_class = @_connection.models[model]
    tableName = model_class.tableName
    sql = []
    sql.push 'id INTEGER PRIMARY KEY AUTOINCREMENT'
    for column, property of model_class._schema
      column_sql = _propertyToSQL property
      if column_sql
        sql.push "\"#{property._dbname}\" #{column_sql}"
    for integrity in model_class._integrities
      if integrity.type is 'child_nullify'
        sql.push "FOREIGN KEY (\"#{integrity.column}\") REFERENCES \"#{integrity.parent.tableName}\"(id) ON DELETE SET NULL"
      else if integrity.type is 'child_restrict'
        sql.push "FOREIGN KEY (\"#{integrity.column}\") REFERENCES \"#{integrity.parent.tableName}\"(id) ON DELETE RESTRICT"
      else if integrity.type is 'child_delete'
        sql.push "FOREIGN KEY (\"#{integrity.column}\") REFERENCES \"#{integrity.parent.tableName}\"(id) ON DELETE CASCADE"
    sql = "CREATE TABLE \"#{tableName}\" ( #{sql.join ','} )"
    try
      await @_client.runAsync sql
    catch error
      throw SQLite3Adapter.wrapError 'unknown error', error
    return

  ## @override AdapterBase::addColumn
  addColumn: (model, column_property) ->
    model_class = @_connection.models[model]
    tableName = model_class.tableName
    sql = "ALTER TABLE \"#{tableName}\" ADD COLUMN \"#{column_property._dbname}\" #{_propertyToSQL column_property}"
    try
      await @_client.runAsync sql
    catch error
      throw SQLite3Adapter.wrapError 'unknown error', error
    return

  ## @override AdapterBase::createIndex
  createIndex: (model, index) ->
    model_class = @_connection.models[model]
    tableName = model_class.tableName
    columns = []
    for column, order of index.columns
      columns.push "\"#{column}\" #{if order is -1 then 'DESC' else 'ASC'}"
    unique = if index.options.unique then 'UNIQUE ' else ''
    sql = "CREATE #{unique}INDEX \"#{index.options.name}\" ON \"#{tableName}\" (#{columns.join ','})"
    try
      await @_client.runAsync sql
    catch error
      throw SQLite3Adapter.wrapError 'unknown error', error
    return

  ## @override AdapterBase::drop
  drop: (model) ->
    tableName = @_connection.models[model].tableName
    try
      await @_client.runAsync "DROP TABLE IF EXISTS \"#{tableName}\""
    catch error
      throw SQLite3Adapter.wrapError 'unknown error', error
    return

  _getModelID: (data) ->
    Number data.id

  valueToModel: (value, property) ->
    if property.type_class is types.Object or property.array
      try
        JSON.parse value
      catch
        null
    else if property.type_class is types.Date
      new Date value
    else if property.type_class is types.Boolean
      value isnt 0
    else
      value

  _buildUpdateSetOfColumn: (property, data, values, fields, places, insert) ->
    dbname = property._dbname
    value = data[dbname]
    if value?.$inc?
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
  create: (model, data) ->
    tableName = @_connection.models[model].tableName
    values = []
    [ fields, places ] = @_buildUpdateSet model, data, values, true
    sql = "INSERT INTO \"#{tableName}\" (#{fields}) VALUES (#{places})"
    try
      id = await new Promise (resolve, reject) =>
        @_client.run sql, values, (error) ->
          if error
            reject error
          else
            resolve @lastID
    catch error
      throw _processSaveError error
    return id

  ## @override AdapterBase::createBulk
  createBulk: (model, data) ->
    tableName = @_connection.models[model].tableName
    values = []
    fields = undefined
    places = []
    data.forEach (item) =>
      [ fields, places_sub ] = @_buildUpdateSet model, item, values, true
      places.push '(' + places_sub + ')'
    sql = "INSERT INTO \"#{tableName}\" (#{fields}) VALUES #{places.join ','}"
    try
      id = await new Promise (resolve, reject) =>
        @_client.run sql, values, (error) ->
          if error
            reject error
          else
            resolve @lastID
    catch error
      throw _processSaveError error
    if id
      id = id - data.length + 1
      return data.map (item, i) -> id + i
    else
      throw new Error 'unexpected result'

  ## @override AdapterBase::update
  update: (model, data) ->
    tableName = @_connection.models[model].tableName
    values = []
    [ fields ] = @_buildUpdateSet model, data, values
    values.push data.id
    sql = "UPDATE \"#{tableName}\" SET #{fields} WHERE id=?"
    try
      await @_client.runAsync sql, values
    catch error
      throw _processSaveError error
    return

  ## @override AdapterBase::updatePartial
  updatePartial: (model, data, conditions, options) ->
    tableName = @_connection.models[model].tableName
    values = []
    [ fields ] = @_buildPartialUpdateSet model, data, values
    sql = "UPDATE \"#{tableName}\" SET #{fields}"
    if conditions.length > 0
      sql += ' WHERE ' + @_buildWhere @_connection.models[model]._schema, conditions, values
    try
      return await new Promise (resolve, reject) =>
        @_client.run sql, values, (error) ->
          if error
            reject error
          else
            resolve @changes
    catch error
      throw _processSaveError error

  ## @override AdapterBase::findById
  findById: (model, id, options) ->
    select = @_buildSelect @_connection.models[model], options.select
    tableName = @_connection.models[model].tableName
    sql = "SELECT #{select} FROM \"#{tableName}\" WHERE id=? LIMIT 1"
    if options.explain
      return await @_client.allAsync "EXPLAIN QUERY PLAN #{sql}", id
    try
      result = await @_client.allAsync sql, id
    catch error
      throw SQLite3Adapter.wrapError 'unknown error', error
    if result?.length is 1
      return @_convertToModelInstance model, result[0], options
    else if result?.length > 1
      throw new Error 'unknown error'
    else
      throw new Error 'not found'

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
      model_class = @_connection.models[model]
      schema = model_class._schema
      orders = options.orders.map (order) ->
        if order[0] is '-'
          column = order[1..]
          order = 'DESC'
        else
          column = order
          order = 'ASC'
        column = schema[column]?._dbname or column
        return "\"#{column}\" #{order}"
      sql += ' ORDER BY ' + orders.join ','
    if options?.limit?
      sql += ' LIMIT ' + options.limit
      sql += ' OFFSET ' + options.skip if options?.skip?
    else if options?.skip?
      sql += ' LIMIT 2147483647 OFFSET ' + options.skip
    #console.log sql, params
    [sql, params]

  ## @override AdapterBase::find
  find: (model, conditions, options) ->
    [sql, params] = @_buildSqlForFind model, conditions, options
    if options.explain
      return await @_client.allAsync "EXPLAIN QUERY PLAN #{sql}", params
    try
      result = await @_client.allAsync sql, params
    catch error
      throw SQLite3Adapter.wrapError 'unknown error', error
    if options.group_fields
      return result.map (record) => @_convertToGroupInstance model, record, options.group_by, options.group_fields
    else
      return result.map (record) => @_convertToModelInstance model, record, options

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
      readable.push @_convertToModelInstance model, record, options
    , ->
      readable.push null
    readable

  ## @override AdapterBase::count
  count: (model, conditions, options) ->
    params = []
    tableName = @_connection.models[model].tableName
    sql = "SELECT COUNT(*) AS count FROM \"#{tableName}\""
    if conditions.length > 0
      sql += ' WHERE ' + @_buildWhere @_connection.models[model]._schema, conditions, params
    if options.group_by
      sql += ' GROUP BY ' + options.group_by.join ','
      if options.conditions_of_group.length > 0
        sql += ' HAVING ' + @_buildWhere options.group_fields, options.conditions_of_group, params
      sql = "SELECT COUNT(*) AS count FROM (#{sql})"
    #console.log sql, params
    try
      result = await @_client.allAsync sql, params
    catch error
      throw SQLite3Adapter.wrapError 'unknown error', error
    if result?.length isnt 1
      throw new Error 'unknown error'
    return Number(result[0].count)

  ## @override AdapterBase::delete
  delete: (model, conditions) ->
    params = []
    tableName = @_connection.models[model].tableName
    sql = "DELETE FROM \"#{tableName}\""
    if conditions.length > 0
      sql += ' WHERE ' + @_buildWhere @_connection.models[model]._schema, conditions, params
    #console.log sql, params
    try
      return await new Promise (resolve, reject) =>
        @_client.run sql, params, (error) ->
          if error
            reject error
          else
            resolve @changes
    catch error
      if error.code is 'SQLITE_CONSTRAINT'
        throw new Error 'rejected'
      throw SQLite3Adapter.wrapError 'unknown error', error

  ##
  # Connects to the database
  # @param {Object} settings
  # @param {String} settings.database
  connect: (settings) ->
    try
      @_client = await new Promise (resolve, reject) =>
        client = new sqlite3.Database settings.database, (error) =>
          if error
            reject error
            return
          client.allAsync = util.promisify client.all
          client.runAsync = util.promisify client.run
          resolve client
    catch error
      throw SQLite3Adapter.wrapError 'failed to open', error

    await @_client.runAsync 'PRAGMA foreign_keys=ON'
    return

  ## @override AdapterBase::close
  close: ->
    if @_client
      @_client.close()
    @_client = null

  ##
  # Exposes sqlite3 module's run method
  run: ->
    @_client.run.apply @_client, arguments

  ##
  # Exposes sqlite3 module's all method
  all: ->
    @_client.all.apply @_client, arguments

module.exports = (connection) ->
  new SQLite3Adapter connection
