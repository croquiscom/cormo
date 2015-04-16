try
  mysql = require 'mysql'
catch e
  console.log 'Install mysql module to use this adapter'
  process.exit 1

SQLAdapterBase = require './sql_base'
types = require '../types'
_ = require 'lodash'

_typeToSQL = (property) ->
  if property.array
    return 'TEXT'
  switch property.type_class
    when types.String then "VARCHAR(#{property.type.length or 255})"
    when types.Number then 'DOUBLE'
    when types.Boolean then 'BOOLEAN'
    when types.Integer then 'INT'
    when types.GeoPoint then 'POINT'
    when types.Date then 'DATETIME'
    when types.Object then 'TEXT'

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
# Adapter for MySQL
# @namespace adapter
class MySQLAdapter extends SQLAdapterBase
  key_type: types.Integer
  support_geopoint: true
  support_string_type_with_length: true
  native_integrity: true
  _escape_ch: '`'

  ##
  # Creates a MySQL adapter
  constructor: (connection) ->
    @_connection = connection

  _query: (sql, data, callback) ->
    #console.log 'MySQLAdapter:', sql
    @_client.query sql, data, callback

  _createTable: (model, callback) ->
    model_class = @_connection.models[model]
    tableName = model_class.tableName
    sql = []
    sql.push 'id INT NOT NULL AUTO_INCREMENT UNIQUE PRIMARY KEY'
    for column, property of model_class._schema
      column_sql = _propertyToSQL property
      if column_sql
        sql.push "`#{property._dbname}` #{column_sql}"
    for index in model_class._indexes
      columns = []
      for column, order of index.columns
        columns.push "`#{column}` #{if order is -1 then 'DESC' else 'ASC'}"
      unique = if index.options.unique then 'UNIQUE ' else ''
      sql.push "#{unique}INDEX `#{index.options.name}` (#{columns.join ','})"
    for integrity in model_class._integrities
      if integrity.type is 'child_nullify'
        sql.push "FOREIGN KEY (`#{integrity.column}`) REFERENCES `#{integrity.parent.tableName}`(id) ON DELETE SET NULL"
      else if integrity.type is 'child_restrict'
        sql.push "FOREIGN KEY (`#{integrity.column}`) REFERENCES `#{integrity.parent.tableName}`(id) ON DELETE RESTRICT"
      else if integrity.type is 'child_delete'
        sql.push "FOREIGN KEY (`#{integrity.column}`) REFERENCES `#{integrity.parent.tableName}`(id) ON DELETE CASCADE"
    sql = "CREATE TABLE `#{tableName}` ( #{sql.join ','} )"
    @_query sql, (error, result) ->
      return callback MySQLAdapter.wrapError 'unknown error', error if error
      callback null

  _alterTable: (model, columns, callback) ->
    # TODO
    callback null

  ## @override AdapterBase::applySchema
  applySchema: (model, callback) ->
    tableName = @_connection.models[model].tableName
    @_query "SHOW COLUMNS FROM `#{tableName}`", (error, columns) =>
      if error?.code is 'ER_NO_SUCH_TABLE'
        @_createTable model, callback
      else
        @_alterTable model, columns, callback

  ## @override AdapterBase::drop
  drop: (model, callback) ->
    tableName = @_connection.models[model].tableName
    @_query "DROP TABLE IF EXISTS `#{tableName}`", (error) ->
      return callback MySQLAdapter.wrapError 'unknown error', error if error
      callback null

  _getModelID: (data) ->
    Number data.id

  valueToModel: (value, property) ->
    if property.type_class is types.Object or property.array
      JSON.parse value
    else if property.type_class is types.GeoPoint
      [value.x, value.y]
    else if property.type_class is types.Boolean
      value isnt 0
    else
      value

  _processSaveError = (error, callback) ->
    if error.code is 'ER_NO_SUCH_TABLE'
      error = new Error('table does not exist')
    else if error.code is 'ER_DUP_ENTRY'
      key = error.message.match /for key '([^']*)'/
      error = new Error('duplicated ' + key?[1])
    else if error.code is 'ER_BAD_NULL_ERROR'
      key = error.message.match /Column '([^']*)'/
      error = new Error("'#{key?[1]}' is required")
    else
      error = MySQLAdapter.wrapError 'unknown error', error
    callback error

  _buildUpdateSetOfColumn: (property, data, values, fields, places, insert) ->
    dbname = property._dbname
    value = data[dbname]
    if property.type_class is types.GeoPoint
      values.push value[0]
      values.push value[1]
      if insert
        fields.push "`#{dbname}`"
        places.push 'POINT(?,?)'
      else
        fields.push "`#{dbname}`=POINT(?,?)"
    else if value?.$inc
      values.push value.$inc
      fields.push "`#{dbname}`=`#{dbname}`+?"
    else
      values.push value
      if insert
        fields.push "`#{dbname}`"
        places.push '?'
      else
        fields.push "`#{dbname}`=?"

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
    sql = "INSERT INTO `#{tableName}` (#{fields}) VALUES (#{places})"
    @_query sql, values, (error, result) ->
      return _processSaveError error, callback if error
      if id = result?.insertId
        callback null, id
      else
        callback new Error 'unexpected result'

  ## @override AdapterBase::createBulk
  createBulk: (model, data, callback) ->
    tableName = @_connection.models[model].tableName
    values = []
    fields = undefined
    places = []
    data.forEach (item) =>
      [ fields, places_sub ] = @_buildUpdateSet model, item, values, true
      places.push '(' + places_sub + ')'
    sql = "INSERT INTO `#{tableName}` (#{fields}) VALUES #{places.join ','}"
    @_query sql, values, (error, result) ->
      return _processSaveError error, callback if error
      if id = result?.insertId
        callback null, data.map (item, i) -> id + i
      else
        callback new Error 'unexpected result'

  ## @override AdapterBase::update
  update: (model, data, callback) ->
    tableName = @_connection.models[model].tableName
    values = []
    [ fields ] = @_buildUpdateSet model, data, values
    values.push data.id
    sql = "UPDATE `#{tableName}` SET #{fields} WHERE id=?"
    @_query sql, values, (error) ->
      return _processSaveError error, callback if error
      callback null

  ## @override AdapterBase::updatePartial
  updatePartial: (model, data, conditions, options, callback) ->
    tableName = @_connection.models[model].tableName
    values = []
    [ fields ] = @_buildPartialUpdateSet model, data, values
    sql = "UPDATE `#{tableName}` SET #{fields}"
    if conditions.length > 0
      try
        sql += ' WHERE ' + @_buildWhere @_connection.models[model]._schema, conditions, values
      catch e
        return callback e
    @_query sql, values, (error, result) ->
      return _processSaveError error, callback if error
      return callback MySQLAdapter.wrapError 'unknown error' if not result?
      callback null, result.affectedRows

  ## @override AdapterBase::findById
  findById: (model, id, options, callback) ->
    id = @_convertValueType id, @key_type
    select = @_buildSelect @_connection.models[model], options.select
    tableName = @_connection.models[model].tableName
    sql = "SELECT #{select} FROM `#{tableName}` WHERE id=? LIMIT 1"
    if options.explain
      return @_query "EXPLAIN #{sql}", id, (error, result) ->
        return callback error if error
        callback null, result
    @_query sql, id, (error, result) =>
      return callback MySQLAdapter.wrapError 'unknown error', error if error
      if result?.length is 1
        if options.lean
          callback null, @_refineRawInstance model, result[0], options.select, options.select_raw
        else
          callback null, @_convertToModelInstance model, result[0], options.select, options.select_raw
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
    if options.near? and field = Object.keys(options.near)[0]
      order_by = "`#{field}_distance`"
      location = options.near[field]
      select += ",GLENGTH(LINESTRING(`#{field}`,POINT(#{location[0]},#{location[1]}))) AS `#{field}_distance`"
    params = []
    tableName = @_connection.models[model].tableName
    sql = "SELECT #{select} FROM `#{tableName}`"
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
    if options?.orders.length > 0 or order_by
      orders = options.orders.map (order) ->
        if order[0] is '-'
          return "`#{order[1..]}` DESC"
        else
          return "`#{order}` ASC"
      if order_by
        orders.push order_by
      sql += ' ORDER BY ' + orders.join ','
    if options?.limit?
      sql += ' LIMIT ' + options.limit
      sql += ' OFFSET ' + options.skip if options?.skip?
    else if options?.skip?
      sql += ' LIMIT 2147483647 OFFSET ' + options.skip
    #console.log sql, params
    if options.explain
      return @_query "EXPLAIN #{sql}", params, (error, result) ->
        return callback error if error
        callback null, result
    @_query sql, params, (error, result) =>
      #console.log result
      return callback MySQLAdapter.wrapError 'unknown error', error if error
      if options.group_fields
        callback null, result.map (record) => @_convertToGroupInstance model, record, options.group_by, options.group_fields
      else
        if options.lean
          callback null, result.map (record) => @_refineRawInstance model, record, options.select, options.select_raw
        else
          callback null, result.map (record) => @_convertToModelInstance model, record, options.select, options.select_raw

  ## @override AdapterBase::count
  count: (model, conditions, callback) ->
    params = []
    tableName = @_connection.models[model].tableName
    sql = "SELECT COUNT(*) AS count FROM `#{tableName}`"
    if conditions.length > 0
      try
        sql += ' WHERE ' + @_buildWhere @_connection.models[model]._schema, conditions, params
      catch e
        return callback e
    #console.log sql, params
    @_query sql, params, (error, result) =>
      return callback MySQLAdapter.wrapError 'unknown error', error if error
      return callback error 'unknown error' if result?.length isnt 1
      callback null, Number(result[0].count)

  ## @override AdapterBase::delete
  delete: (model, conditions, callback) ->
    params = []
    tableName = @_connection.models[model].tableName
    sql = "DELETE FROM `#{tableName}`"
    if conditions.length > 0
      try
        sql += ' WHERE ' + @_buildWhere @_connection.models[model]._schema, conditions, params
      catch e
        return callback e
    #console.log sql, params
    @_query sql, params, (error, result) ->
      return callback new Error 'rejected' if error and error.code in ['ER_ROW_IS_REFERENCED_', 'ER_ROW_IS_REFERENCED_2']
      return callback MySQLAdapter.wrapError 'unknown error', error if error or not result?
      callback null, result.affectedRows

  ##
  # Connects to the database
  # @param {Object} settings
  # @param {String} [settings.host]
  # @param {Number} [settings.port]
  # @param {String} [settings.user]
  # @param {String} [settings.password]
  # @param {String} settings.database
  # @nodejscallback
  connect: (settings, callback) ->
    # connect
    client = mysql.createConnection
      host: settings.host
      port: settings.port
      user: settings.user
      password: settings.password
    client.connect (error) =>
      return callback MySQLAdapter.wrapError 'failed to connect', error if error

      @_client = client

      @_selectDatabase settings, callback

  _selectDatabase: (settings, callback) ->
    # select database
    @_client.query "USE `#{settings.database}`", (error) =>
      return callback null if not error

      # create one if not exist
      if error.code is 'ER_BAD_DB_ERROR'
        @_client.query "CREATE DATABASE `#{settings.database}`", (error) =>
          return callback MySQLAdapter.wrapError 'unknown error', error if error
          @_selectDatabase settings, callback
      else
        msg = if error.code is 'ER_DBACCESS_DENIED_ERROR' then "no access right to the database '#{settings.database}'" else 'unknown error'
        callback MySQLAdapter.wrapError msg, error

  ## @override AdapterBase::close
  close: ->
    if @_client
      @_client.end()
    @_client = null

  ##
  # Exposes mysql module's query method
  query: (sql, values, callback) ->
    @_client.query sql, values, callback

module.exports = (connection) ->
  new MySQLAdapter connection
