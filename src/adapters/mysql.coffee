try
  mysql = require 'mysql'
catch e
  console.log 'Install mysql module to use this adapter'
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
    when types.ForeignKey then 'BIGINT'
    when types.GeoPoint then 'POINT'

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
# Adapter for MySQL
###
class MySQLAdapter extends AdapterBase
  support_geopoint: true

  ###
  # Creates a MySQL adapter
  # @param {mysql.Connection} client
  ###
  constructor: (connection, client) ->
    @_connection = connection
    @_client = client
    @_select_all_columns = {}

  _query: (sql, data, callback) ->
    #console.log 'MySQLAdapter:', sql
    @_client.query sql, data, callback

  _createTable: (model, callback) ->
    table = tableize model
    sql = []
    sql.push 'id BIGINT NOT NULL AUTO_INCREMENT UNIQUE PRIMARY KEY'
    for column, property of @_connection.models[model]._schema
      column_sql = _propertyToSQL property
      if column_sql
        sql.push column + ' ' + column_sql
    sql = "CREATE TABLE #{table} ( #{sql.join ','} )"
    @_query sql, (error, result) ->
      return callback MySQLAdapter.wrapError 'unknown error', error if error
      callback null

  _alterTable: (model, columns, callback) ->
    # TODO
    callback null

  _applySchema: (model, callback) ->
    columns = ['id']
    for column, property of @_connection.models[model]._schema
      if property.type is types.GeoPoint
        columns.push "ASTEXT(#{column}) as #{column}"
      else
        columns.push column
    @_select_all_columns[model] = columns

    @_query "SHOW COLUMNS FROM #{tableize model}", (error, columns) =>
      if error?.code is 'ER_NO_SUCH_TABLE'
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
      return callback MySQLAdapter.wrapError 'unknown error', error if error
      callback null

  _processSaveError = (error, callback) ->
    if error.code is 'ER_DUP_ENTRY'
      key = error.message.match /for key '([^']*)'/
      error = new Error('duplicated ' + key?[1])
    else if error.code is 'ER_BAD_NULL_ERROR'
      key = error.message.match /Column '([^']*)'/
      error = new Error("'#{key?[1]}' is required")
    else
      error = MySQLAdapter.wrapError 'unknown error', error
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
    schema = @_connection.models[model]._schema
    fields = []
    values = []
    Object.keys(data).forEach (field) ->
      return if field is 'id'
      if schema[field].type is types.GeoPoint
        fields.push field + '=POINT(?,?)'
        values.push data[field][0]
        values.push data[field][1]
      else
        fields.push field + '=?'
        values.push data[field]
    sql = "INSERT INTO #{tableize model} SET #{fields.join ','}"
    @_query sql, values, (error, result) ->
      return _processSaveError error, callback if error
      if result?.insertId
        callback null, result.insertId
      else
        callback new Error 'unexpected result'

  ###
  # Updates a record
  # @param {String} model
  # @param {Object} data
  # @param {Function} callback
  # @param {Error} callback.error
  ###
  update: (model, data, callback) ->
    schema = @_connection.models[model]._schema
    fields = []
    values = []
    Object.keys(data).forEach (field) ->
      return if field is 'id'
      if schema[field].type is types.GeoPoint
        fields.push field + '=POINT(?,?)'
        values.push data[field][0]
        values.push data[field][1]
      else
        fields.push field + '=?'
        values.push data[field]
    sql = "UPDATE #{tableize model} SET #{fields.join ','} WHERE id=?"
    values.push data.id
    @_query sql, values, (error) ->
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
      else if property.type is types.GeoPoint
        match = /POINT\((.*) (.*)\)/.exec data[column]
        record[column] = [Number(match[1]),Number(match[2])]
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
    selects = @_select_all_columns[model].join ','
    sql = "SELECT #{selects} FROM #{tableize model} WHERE id=? LIMIT 1"
    @_query sql, id, (error, result) =>
      return callback MySQLAdapter.wrapError 'unknown error', error if error
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
    selects = @_select_all_columns[model].join ','
    if options.near? and field = Object.keys(options.near)[0]
      order_by = "#{field}_distance"
      location = options.near[field]
      selects += ",GLENGTH(LINESTRING(#{field},POINT(#{location[0]},#{location[1]}))) AS #{field}_distance"
    params = []
    sql = "SELECT #{selects} FROM #{tableize model}"
    if conditions.length > 0
      sql += ' WHERE ' + _buildWhere conditions, params
    if order_by
      sql += ' ORDER BY ' + order_by
    if options?.limit?
      sql += ' LIMIT ' + options.limit
    #console.log sql, params
    @_query sql, params, (error, result) =>
      #console.log result
      return callback MySQLAdapter.wrapError 'unknown error', error if error
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
    @_query sql, params, (error, result) =>
      return callback MySQLAdapter.wrapError 'unknown error', error if error
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
    @_query sql, params, (error, result) ->
      return callback MySQLAdapter.wrapError 'unknown error', error if error or not result?
      callback null, result.affectedRows

  ###
  # Creates a MySQL adapter
  # @param {Connection} connection
  # @param {Object} settings
  # @param {String} [settings.host]
  # @param {Number} [settings.port]
  # @param {String} [settings.user]
  # @param {String} [settings.password]
  # @param {String} settings.database
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {MySQLAdapter} callback.adapter
  ###
  @createAdapter: (connection, settings, callback) ->
    # connect
    client = mysql.createConnection
      host: settings.host
      port: settings.port
      user: settings.user
      password: settings.password
    client.connect (error) ->
      return callback MySQLAdapter.wrapError 'failed to connect', error if error

      adapter = new MySQLAdapter connection, client

      # select database
      client.query "USE `#{settings.database}`", (error) ->
        return callback null, adapter if not error

        # create one if not exist
        if error.code is 'ER_BAD_DB_ERROR'
          client.query "CREATE DATABASE `#{settings.database}`", (error) ->
            return callback MySQLAdapter.wrapError 'unknown error', error if error
            return callback null, adapter
        else
          msg = if error.code is 'ER_DBACCESS_DENIED_ERROR' then "no access right to the database '#{settings.database}'" else 'unknown error'
          callback MySQLAdapter.wrapError msg, error

module.exports = MySQLAdapter.createAdapter
