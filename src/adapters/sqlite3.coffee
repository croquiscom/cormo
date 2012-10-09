try
  sqlite3 = require 'sqlite3'
catch e
  console.log 'Install sqlite3 module to use this adapter'
  process.exit 1

AdapterBase = require './base'
types = require '../types'
tableize = require('../inflector').tableize
async = require 'async'

_typeToSQL = (property) ->
  switch property.type
    when types.String then 'VARCHAR(255)'
    when types.Number then 'DOUBLE'
    when types.Integer then 'INT'
    when types.ForeignKey then 'INTEGER'

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

_buildWhere = (conditions, params, conjunction='AND') ->
  if Array.isArray conditions
    subs = conditions.map (condition) -> _buildWhere condition, params
  else if typeof conditions is 'object'
    keys = Object.keys conditions
    if keys.length is 0
      return ''
    if keys.length is 1
      key = keys[0]
      if key.substr(0, 1) is '$'
        switch key
          when '$and'
            return _buildWhere conditions[key], params, 'AND'
          when '$or'
            return _buildWhere conditions[key], params, 'OR'
      else
        value = conditions[key]
        op = '='
        if typeof value is 'object' and (keys = Object.keys value).length is 1
          sub_key = keys[0]
          switch sub_key
            when '$gt'
              op = '>'
              value = value[sub_key]
            when '$lt'
              op = '<'
              value = value[sub_key]
            when '$gte'
              op = '>='
              value = value[sub_key]
            when '$lte'
              op = '<='
              value = value[sub_key]
            when '$include'
              op = ' LIKE '
              value = '%' + value[sub_key] + '%'
        params.push value
        return key + op + '?'
    else
      subs = keys.map (key) ->
        obj = {}
        obj[key] = conditions[key]
        _buildWhere obj, params
  else
    return ''
  return '(' + subs.join(' ' + conjunction + ' ') + ')'

###
# Adapter for SQLite3
###
class SQLite3Adapter extends AdapterBase
  ###
  # Creates a SQLite3 adapter
  # @param {sqlite3.Database} client
  ###
  constructor: (connection, client) ->
    @_connection = connection
    @_client = client

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
        sql.push column + ' ' + column_sql
    sql = "CREATE TABLE #{table} ( #{sql.join ','} )"
    @_query 'run', sql, (error, result) ->
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      callback null

  _applySchema: (model, callback) ->
    # TODO check table existence
    @_createTable model, callback

  ###
  # Creates or alters tables reflecting schemas
  # @param {Function} callback
  # @param {Error} callback.error
  # @see DBConnection.applySchemas
  ###
  applySchemas: (callback) ->
    async.forEach Object.keys(@_connection.models), (model, callback) =>
        @_applySchema model, callback
      , (error) ->
        callback error

  ###
  # Drops a model from the database
  # @param {String} model
  # @param {Function} callback
  # @param {Error} callback.error
  # @see DBModel.drop
  ###
  drop: (model, callback) ->
    table = tableize model
    @_query 'run', "DROP TABLE IF EXISTS #{table}", (error) ->
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      callback null

  _processSaveError = (error, callback) ->
    if error.code is 'SQLITE_CONSTRAINT'
      error = new Error('duplicated')
    else
      error = SQLite3Adapter.wrapError 'unknown error', error
    callback error

  ###
  # Creates a record
  # @param {String} model
  # @param {Object} data
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {String} callback.id
  ###
  create: (model, data, callback) ->
    fields = []
    places = []
    values = []
    Object.keys(data).forEach (field) ->
      fields.push field
      places.push '?'
      values.push data[field]
    sql = "INSERT INTO #{tableize model} (#{fields.join ','}) VALUES (#{places.join ','})"
    @_query 'run', sql, values, (error) ->
      return _processSaveError error, callback if error
      callback null, @lastID

  ###
  # Updates a record
  # @param {String} model
  # @param {Object} data
  # @param {Function} callback
  # @param {Error} callback.error
  ###
  update: (model, data, callback) ->
    fields = []
    values = []
    Object.keys(data).forEach (field) ->
      return if field is 'id'
      fields.push field + '=?'
      values.push data[field]
    sql = "UPDATE #{tableize model} SET #{fields.join ','} WHERE id=?"
    values.push data.id
    @_query 'run', sql, values, (error) ->
      return _processSaveError error, callback if error
      callback null

  _convertToModelInstance: (model, data) ->
    modelClass = @_connection.models[model]
    record = new modelClass()
    Object.defineProperty record, 'id', configurable: false, enumerable: true, writable: false, value: Number(data.id)
    for column, property of modelClass._schema
      continue if not data[column]?
      if property.type is types.ForeignKey
        record[column] = Number(data[column])
      else
        record[column] = data[column]
    return record

  ###
  # Finds a record by id
  # @param {String} model
  # @param {String} id
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {DBModel} callback.record
  # @throws Error('not found')
  ###
  findById: (model, id, callback) ->
    table = tableize model
    @_query 'all', "SELECT * FROM #{table} WHERE id=? LIMIT 1", id, (error, result) =>
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      if result?.length is 1
        callback null, @_convertToModelInstance model, result[0]
      else if result?.length > 1
        callback new Error 'unknown error'
      else
        callback new Error 'not found'

  ###
  # Finds records
  # @param {String} model
  # @param {Object} conditions
  # @param {Object} options
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Array<DBModel>} callback.records
  ###
  find: (model, conditions, options, callback) ->
    params = []
    sql = "SELECT * FROM #{tableize model}"
    if conditions.length > 0
      sql += ' WHERE ' + _buildWhere conditions, params
    if options?.limit?
      sql += ' LIMIT ' + options.limit
    #console.log sql, params
    @_query 'all', sql, params, (error, result) =>
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      callback null, result.map (record) => @_convertToModelInstance model, record

  ###
  # Counts records
  # @param {String} model
  # @param {Object} conditions
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Number} callback.count
  ###
  count: (model, conditions, callback) ->
    params = []
    sql = "SELECT COUNT(*) AS count FROM #{tableize model}"
    if conditions.length > 0
      sql += ' WHERE ' + _buildWhere conditions, params
    #console.log sql, params
    @_query 'all', sql, params, (error, result) =>
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      return callback error 'unknown error' if result?.length isnt 1
      callback null, Number(result[0].count)

  ###
  # Deletes records from the database
  # @param {String} model
  # @param {Object} conditions
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Number} callback.count
  ###
  delete: (model, conditions, callback) ->
    params = []
    sql = "DELETE FROM #{tableize model}"
    if conditions.length > 0
      sql += ' WHERE ' + _buildWhere conditions, params
    #console.log sql, params
    @_query 'run', sql, params, (error) ->
      # @ is sqlite3.Statement
      return callback SQLite3Adapter.wrapError 'unknown error', error if error
      callback null, @changes

  ###
  # Creates a SQLite3 adapter
  # @param {Connection} connection
  # @param {Object} settings
  # @param {String} settings.database
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {SQLite3Adapter} callback.adapter
  ###
  @createAdapter: (connection, settings, callback) ->
    client = new sqlite3.Database settings.database, (error) ->
      return callback SQLite3Adapter.wrapError 'failed to open', error if error

      adapter = new SQLite3Adapter connection, client
      callback null, adapter

module.exports = SQLite3Adapter.createAdapter
