try
  sqlite3 = require 'sqlite3'
catch e
  console.log 'Install sqlite3 module to use this adapter'
  process.exit 1

SQLAdapterBase = require './sql_base'
types = require '../types'
async = require 'async'
_ = require 'underscore'

_typeToSQL = (property) ->
  if property.array
    return 'VARCHAR(255)'
  switch property.type
    when types.String then 'VARCHAR(255)'
    when types.Number then 'DOUBLE'
    when types.Boolean then 'TINYINT'
    when types.Integer then 'INT'
    when types.Date then 'REAL'
    when types.Object then 'VARCHAR(255)'

_propertyToSQL = (property) ->
  type = _typeToSQL property
  if type
    if property.required
      type += ' NOT NULL'
    else
      type += ' NULL'
    if property.unique
      type += ' UNIQUE'
    return type

##
# Adapter for SQLite3
# @namespace adapter
class SQLite3Adapter extends SQLAdapterBase
  key_type: types.Integer
  native_integrity: true

  ##
  # Creates a SQLite3 adapter
  constructor: (connection) ->
    @_connection = connection

  _query: (method, sql, data, callback) ->
    #console.log 'SQLite3Adapter:', sql
    @_client[method].apply @_client, [].slice.call arguments, 1

  _createTable: (model, callback) ->
    model_class = @_connection.models[model]
    tableName = model_class.tableName
    sql = []
    sql.push 'id INTEGER PRIMARY KEY AUTOINCREMENT'
    for column, property of model_class._schema
      column_sql = _propertyToSQL property
      if column_sql
        sql.push property._dbname + ' ' + column_sql
    for integrity in model_class._integrities
      if integrity.type is 'child_nullify'
        sql.push "FOREIGN KEY (#{integrity.column}) REFERENCES #{integrity.parent.tableName}(id) ON DELETE SET NULL"
      else if integrity.type is 'child_restrict'
        sql.push "FOREIGN KEY (#{integrity.column}) REFERENCES #{integrity.parent.tableName}(id) ON DELETE RESTRICT"
      else if integrity.type is 'child_delete'
        sql.push "FOREIGN KEY (#{integrity.column}) REFERENCES #{integrity.parent.tableName}(id) ON DELETE CASCADE"
    sql = "CREATE TABLE #{tableName} ( #{sql.join ','} )"
    @_query 'run', sql, (error, result) =>
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      async.forEach model_class._indexes, (index, callback) =>
        columns = []
        for column, order of index.columns
          order = if order is -1 then 'DESC' else 'ASC'
          columns.push column + ' ' + order
        unique = if index.options.unique then 'UNIQUE ' else ''
        sql = "CREATE #{unique}INDEX #{index.options.name} ON #{tableName} (#{columns.join ','})"
        @_query 'run', sql, callback
      , (error) ->
        return callback SQLite3Adapter.wrapError 'unknown error', error if error
        callback null

  ## @override AdapterBase::applySchema
  applySchema: (model, callback) ->
    # TODO check table existence
    @_createTable model, callback

  ## @override AdapterBase::drop
  drop: (model, callback) ->
    tableName = @_connection.models[model].tableName
    @_query 'run', "DROP TABLE IF EXISTS #{tableName}", (error) ->
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      callback null

  _getModelID: (data) ->
    Number data.id

  valueToModel: (value, column, property) ->
    if property.type is types.Object or property.array
      JSON.parse value
    else if property.type is types.Date
      new Date value
    else if property.type is types.Boolean
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
    if property.type is types.Date
      values.push data[dbname]?.getTime()
    else
      values.push data[dbname]
    if insert
      fields.push dbname
      places.push '?'
    else
      fields.push dbname + '=?'

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
    sql = "INSERT INTO #{tableName} (#{fields}) VALUES (#{places})"
    @_query 'run', sql, values, (error) ->
      return _processSaveError error, callback if error
      callback null, @lastID

  ## @override AdapterBase::createBulk
  createBulk: (model, data, callback) ->
    # bulk insert supported on 3.7.11,
    # but sqlite3 module 2.1.5 has 3.7.8
    @_createBulkDefault model, data, callback

  ## @override AdapterBase::update
  update: (model, data, callback) ->
    tableName = @_connection.models[model].tableName
    values = []
    [ fields ] = @_buildUpdateSet model, data, values
    values.push data.id
    sql = "UPDATE #{tableName} SET #{fields} WHERE id=?"
    @_query 'run', sql, values, (error) ->
      return _processSaveError error, callback if error
      callback null

  ## @override AdapterBase::updatePartial
  updatePartial: (model, data, conditions, options, callback) ->
    tableName = @_connection.models[model].tableName
    values = []
    [ fields ] = @_buildPartialUpdateSet model, data, values
    sql = "UPDATE #{tableName} SET #{fields}"
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
    @_query 'all', "SELECT #{select} FROM #{tableName} WHERE id=? LIMIT 1", id, (error, result) =>
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      if result?.length is 1
        if options.lean
          callback null, @_refineRawInstance model, result[0], options.select
        else
          callback null, @_convertToModelInstance model, result[0], options.select
      else if result?.length > 1
        callback new Error 'unknown error'
      else
        callback new Error 'not found'

  ## @override AdapterBase::find
  find: (model, conditions, options, callback) ->
    if options.group_by or options.group_fields
      select = @_buildGroupFields options.group_by, options.group_fields
    else
      select = @_buildSelect @_connection.models[model], options.select
    tableName = @_connection.models[model].tableName
    params = []
    sql = "SELECT #{select} FROM #{tableName}"
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
    if options?.orders.length > 0
      orders = options.orders.map (order) ->
        if order[0] is '-'
          return order[1..] + ' DESC'
        else
          return order + ' ASC'
      sql += ' ORDER BY ' + orders.join ','
    if options?.limit?
      sql += ' LIMIT ' + options.limit
      sql += ' OFFSET ' + options.skip if options?.skip?
    else if options?.skip?
      sql += ' LIMIT 2147483647 OFFSET ' + options.skip
    #console.log sql, params
    @_query 'all', sql, params, (error, result) =>
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      if options.group_fields
        callback null, result.map (record) => @_convertToGroupInstance model, record, options.group_by, options.group_fields
      else
        if options.lean
          callback null, result.map (record) => @_refineRawInstance model, record, options.select
        else
          callback null, result.map (record) => @_convertToModelInstance model, record, options.select

  ## @override AdapterBase::count
  count: (model, conditions, callback) ->
    params = []
    tableName = @_connection.models[model].tableName
    sql = "SELECT COUNT(*) AS count FROM #{tableName}"
    if conditions.length > 0
      try
        sql += ' WHERE ' + @_buildWhere @_connection.models[model]._schema, conditions, params
      catch e
        return callback e
    #console.log sql, params
    @_query 'all', sql, params, (error, result) =>
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      return callback error 'unknown error' if result?.length isnt 1
      callback null, Number(result[0].count)

  ## @override AdapterBase::delete
  delete: (model, conditions, callback) ->
    params = []
    tableName = @_connection.models[model].tableName
    sql = "DELETE FROM #{tableName}"
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
  # @param {Function} callback
  # @param {Error} callback.error
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
