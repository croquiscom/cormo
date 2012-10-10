try
  pg = require 'pg'
catch e
  console.log 'Install pg module to use this adapter'
  process.exit 1

AdapterBase = require './base'
types = require '../types'
tableize = require('../inflector').tableize
async = require 'async'

_typeToSQL = (property) ->
  switch property.type
    when types.String then 'VARCHAR(255)'
    when types.Number then 'DOUBLE PRECISION'
    when types.Integer then 'INT'

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
              op = ' ILIKE '
              value = '%' + value[sub_key] + '%'
        params.push value
        return key + op + '$' + params.length
    else
      subs = keys.map (key) ->
        obj = {}
        obj[key] = conditions[key]
        _buildWhere obj, params
  else
    return ''
  return '(' + subs.join(' ' + conjunction + ' ') + ')'

###
# Adapter for PostgreSQL
###
class PostgreSQLAdapter extends AdapterBase
  key_type: types.Integer

  ###
  # Creates a PostgreSQL adapter
  ###
  constructor: (connection) ->
    @_connection = connection

  _query: (sql, data, callback) ->
    #console.log 'PostgreSQLAdapter:', sql
    @_client.query sql, data, (error, result) ->
      callback error, result

  _createTable: (model, callback) ->
    table = tableize model
    sql = []
    sql.push 'id SERIAL PRIMARY KEY'
    for column, property of @_connection.models[model]._schema
      column_sql = _propertyToSQL property
      if column_sql
        sql.push column + ' ' + column_sql
    sql = "CREATE TABLE #{table} ( #{sql.join ','} )"
    @_query sql, (error) ->
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      callback null

  _alterTable: (model, columns, callback) ->
    # TODO
    callback null

  _applySchema: (model, callback) ->
    table = tableize model
    @_query "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name=$1", [table], (error, result) =>
      columns = result?.rows
      if error or columns.length is 0
        @_createTable model, callback
      else
        @_alterTable model, columns, callback

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
    @_query "DROP TABLE IF EXISTS #{table}", (error) ->
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      callback null

  _processSaveError = (model, error, callback) ->
    if error.code is '42P01'
      error = new Error('table does not exist')
    else if error.code is '23505'
      re = new RegExp "unique constraint \"#{tableize model}_([^']*)_key\""
      key = error.message.match re
      error = new Error('duplicated ' + key?[1])
    else
      error = PostgreSQLAdapter.wrapError 'unknown error', error
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
      values.push data[field]
      places.push '$' + values.length
    sql = "INSERT INTO #{tableize model} (#{fields.join ','}) VALUES (#{places.join ','}) RETURNING id"
    @_query sql, values, (error, result) ->
      rows = result?.rows
      return _processSaveError model, error, callback if error
      if rows?.length is 1 and rows[0].id?
        callback null, rows[0].id
      else
        callback new Error 'unexpected rows'

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
      values.push data[field]
      fields.push field + '=$' + values.length
    values.push data.id
    sql = "UPDATE #{tableize model} SET #{fields.join ','} WHERE id=$#{values.length}"
    @_query sql, values, (error) ->
      return _processSaveError model, error, callback if error
      callback null

  _convertToModelInstance: (model, data) ->
    modelClass = @_connection.models[model]
    record = new modelClass()
    Object.defineProperty record, 'id', configurable: false, enumerable: true, writable: false, value: Number(data.id)
    for column, property of modelClass._schema
      continue if not data[column]?
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
    @_query "SELECT * FROM #{table} WHERE id=$1 LIMIT 1", [id], (error, result) =>
      rows = result?.rows
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      if rows?.length is 1
        callback null, @_convertToModelInstance model, rows[0]
      else if rows?.length > 1
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
    @_query sql, params, (error, result) =>
      rows = result?.rows
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      callback null, rows.map (record) => @_convertToModelInstance model, record

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
    @_query sql, params, (error, result) =>
      rows = result?.rows
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      return callback error 'unknown error' if rows?.length isnt 1
      callback null, Number(rows[0].count)

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
    @_query sql, params, (error, result) ->
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error or not result?
      callback null, result.rowCount

  ###
  # Connects to the database
  # @param {Object} settings
  # @param {String} [settings.host]
  # @param {Number} [settings.port]
  # @param {String} [settings.user]
  # @param {String} [settings.password]
  # @param {String} settings.database
  # @param {Function} callback
  # @param {Error} callback.error
  ###
  connect: (settings, callback) ->
    # connect
    pg.connect
        host: settings.host
        port: settings.port
        user: settings.user
        password: settings.password
        database: settings.database
      , (error, client) =>
        if error?.code is '3D000'
          return callback new Error 'database does not exist'
        return callback PostgreSQLAdapter.wrapError 'failed to connect', error if error

        @_client = client
        return callback null

module.exports = (connection) ->
  new PostgreSQLAdapter connection
