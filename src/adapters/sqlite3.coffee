try
  sqlite3 = require 'sqlite3'
catch e
  console.log 'Install sqlite3 module to use this adapter'
  process.exit 1

SQLAdapterBase = require './sql_base'
types = require '../types'
tableize = require('../inflector').tableize
async = require 'async'
_ = require 'underscore'

_typeToSQL = (property) ->
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

  ##
  # Creates a SQLite3 adapter
  constructor: (connection) ->
    @_connection = connection

  _query: (method, sql, data, callback) ->
    #console.log 'SQLite3Adapter:', sql
    @_client[method].apply @_client, [].slice.call arguments, 1

  _createTable: (model, callback) ->
    table = tableize model
    sql = []
    sql.push 'id INTEGER PRIMARY KEY AUTOINCREMENT'
    for column, property of @_connection.models[model]._schema
      column_sql = _propertyToSQL property
      if column_sql
        sql.push property.dbname + ' ' + column_sql
    sql = "CREATE TABLE #{table} ( #{sql.join ','} )"
    @_query 'run', sql, (error, result) ->
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      callback null

  _applySchema: (model, callback) ->
    # TODO check table existence
    @_createTable model, callback

  ## @override AdapterBase::applySchemas
  applySchemas: (callback) ->
    async.forEach Object.keys(@_connection.models), (model, callback) =>
        @_applySchema model, callback
      , (error) ->
        callback error

  ## @override AdapterBase::drop
  drop: (model, callback) ->
    table = tableize model
    @_query 'run', "DROP TABLE IF EXISTS #{table}", (error) ->
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      callback null

  _getModelID: (data) ->
    Number data.id

  valueToModel: (value, column, property) ->
    if property.type is types.Object
      return JSON.parse value
    if value?
      if property.type is types.Date
        return new Date value
      else if property.type is types.Boolean
        return value isnt 0
    return value

  _processSaveError = (error, callback) ->
    if /no such table/.test error.message
      error = new Error('table does not exist')
    else if error.code is 'SQLITE_CONSTRAINT'
      error = new Error('duplicated')
    else
      error = SQLite3Adapter.wrapError 'unknown error', error
    callback error

  _buildUpdateSetOfColumn: (property, data, values, fields, places, insert) ->
    dbname = property.dbname
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
      property = _.find schema, (item) -> return item.dbname is column
      @_buildUpdateSetOfColumn property, data, values, fields, places
    [ fields.join(','), places.join(',') ]

  ## @override AdapterBase::create
  create: (model, data, callback) ->
    values = []
    [ fields, places ] = @_buildUpdateSet model, data, values, true
    sql = "INSERT INTO #{tableize model} (#{fields}) VALUES (#{places})"
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
    values = []
    [ fields ] = @_buildUpdateSet model, data, values
    values.push data.id
    sql = "UPDATE #{tableize model} SET #{fields} WHERE id=?"
    @_query 'run', sql, values, (error) ->
      return _processSaveError error, callback if error
      callback null

  ## @override AdapterBase::updatePartial
  updatePartial: (model, data, conditions, options, callback) ->
    values = []
    [ fields ] = @_buildPartialUpdateSet model, data, values
    sql = "UPDATE #{tableize model} SET #{fields}"
    if conditions.length > 0
      sql += ' WHERE ' + @_buildWhere conditions, values
    @_query 'run', sql, values, (error) ->
      return _processSaveError error, callback if error
      callback null, @changes

  ## @override AdapterBase::findById
  findById: (model, id, options, callback) ->
    if options.select
      selects = 'id,' + options.select.join ','
    else
      selects = '*'
    table = tableize model
    @_query 'all', "SELECT #{selects} FROM #{table} WHERE id=? LIMIT 1", id, (error, result) =>
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      if result?.length is 1
        callback null, @_convertToModelInstance model, result[0]
      else if result?.length > 1
        callback new Error 'unknown error'
      else
        callback new Error 'not found'

  ## @override AdapterBase::find
  find: (model, conditions, options, callback) ->
    if options.select
      selects = 'id,' + options.select.join ','
    else
      selects = '*'
    params = []
    sql = "SELECT #{selects} FROM #{tableize model}"
    if conditions.length > 0
      sql += ' WHERE ' + @_buildWhere conditions, params
    if options?.limit?
      sql += ' LIMIT ' + options.limit
    if options?.orders.length > 0
      orders = options.orders.map (order) ->
        if order[0] is '-'
          return order[1..] + ' DESC'
        else
          return order + ' ASC'
      sql += ' ORDER BY ' + orders.join ','
    #console.log sql, params
    @_query 'all', sql, params, (error, result) =>
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      callback null, result.map (record) => @_convertToModelInstance model, record

  ## @override AdapterBase::count
  count: (model, conditions, callback) ->
    params = []
    sql = "SELECT COUNT(*) AS count FROM #{tableize model}"
    if conditions.length > 0
      sql += ' WHERE ' + @_buildWhere conditions, params
    #console.log sql, params
    @_query 'all', sql, params, (error, result) =>
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      return callback error 'unknown error' if result?.length isnt 1
      callback null, Number(result[0].count)

  ## @override AdapterBase::delete
  delete: (model, conditions, callback) ->
    params = []
    sql = "DELETE FROM #{tableize model}"
    if conditions.length > 0
      sql += ' WHERE ' + @_buildWhere conditions, params
    #console.log sql, params
    @_query 'run', sql, params, (error) ->
      # @ is sqlite3.Statement
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
      callback null

module.exports = (connection) ->
  new SQLite3Adapter connection
