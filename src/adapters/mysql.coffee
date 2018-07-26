try
  mysql = require 'mysql'
catch e
  console.log 'Install mysql module to use this adapter'
  process.exit 1

SQLAdapterBase = require './sql_base'
types = require '../types'

_ = require 'lodash'
async = require 'async'
stream = require 'stream'

_typeToSQL = (property, support_fractional_seconds) ->
  if property.array
    return 'TEXT'
  switch property.type_class
    when types.String then "VARCHAR(#{property.type.length or 255})"
    when types.Number then 'DOUBLE'
    when types.Boolean then 'BOOLEAN'
    when types.Integer then 'INT'
    when types.GeoPoint then 'POINT'
    when types.Date
      if support_fractional_seconds then 'DATETIME(3)' else 'DATETIME'
    when types.Object then 'TEXT'
    when types.Text then 'TEXT'

_propertyToSQL = (property, support_fractional_seconds) ->
  type = _typeToSQL property, support_fractional_seconds
  if type
    if property.required
      type += ' NOT NULL'
    else
      type += ' NULL'
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
    super()
    @_connection = connection

  _query: (sql, data, callback) ->
    #console.log 'MySQLAdapter:', sql
    @_client.query sql, data, callback

  _getTables: (callback) ->
    @_query "SHOW TABLES", (error, tables) ->
      return callback error if error
      tables = tables.map (table) ->
        key = Object.keys(table)[0]
        table[key]
      callback null, tables

  _getSchema: (table, callback) ->
    @_query "SHOW COLUMNS FROM `#{table}`", (error, columns) ->
      return callback error if error
      schema = {}
      for column in columns
        type = if /^varchar\((\d*)\)/i.test column.Type
          new types.String(RegExp.$1)
        else if /^double/i.test column.Type
          new types.Number()
        else if /^tinyint\(1\)/i.test column.Type
          new types.Boolean()
        else if /^int/i.test column.Type
          new types.Integer()
        else if /^point/i.test column.Type
          new types.GeoPoint()
        else if /^datetime/i.test column.Type
          new types.Date()
        else if /^text/i.test column.Type
          new types.Object()
        schema[column.Field] = type: type, required: column.Null is 'NO'
      callback null, schema

  _getIndexes: (callback) ->
    @_query "SELECT * FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? ORDER BY SEQ_IN_INDEX", [@_database], (error, rows) ->
      return callback error if error
      indexes = {}
      for row in rows
        indexes_of_table = indexes[row.TABLE_NAME] or= {}
        (indexes_of_table[row.INDEX_NAME] or= {})[row.COLUMN_NAME] = 1
      callback null, indexes

  _getForeignKeys: (callback) ->
    @_query "SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME IS NOT NULL AND CONSTRAINT_SCHEMA = ?", [@_database], (error, rows) ->
      return callback error if error
      foreign_keys = {}
      for row in rows
        foreign_keys_of_table = foreign_keys[row.TABLE_NAME] or= {}
        foreign_keys_of_table[row.COLUMN_NAME] = row.REFERENCED_TABLE_NAME
      callback null, foreign_keys

  ## @override AdapterBase::getSchemas
  getSchemas: () ->
    new Promise (resolve, reject) =>
      async.auto
        get_tables: (callback) =>
          @_getTables callback
        get_table_schemas: ['get_tables', (results, callback) =>
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
        get_indexes: (callback) =>
          @_getIndexes callback
        get_foreign_keys: (callback) =>
          @_getForeignKeys callback
      , (error, results) ->
        if error
          reject error
        else
          resolve tables: results.get_table_schemas, indexes: results.get_indexes, foreign_keys: results.get_foreign_keys

  ## @override AdapterBase::createTable
  createTable: (model) ->
    new Promise (resolve, reject) =>
      model_class = @_connection.models[model]
      tableName = model_class.tableName
      sql = []
      sql.push 'id INT NOT NULL AUTO_INCREMENT UNIQUE PRIMARY KEY'
      for column, property of model_class._schema
        column_sql = _propertyToSQL property, @support_fractional_seconds
        if column_sql
          sql.push "`#{property._dbname}` #{column_sql}"
      sql = "CREATE TABLE `#{tableName}` ( #{sql.join ','} )"
      sql += " DEFAULT CHARSET=#{@_settings.charset or 'utf8'}"
      sql += " COLLATE=#{@_settings.collation or 'utf8_unicode_ci'}"
      @_query sql, (error) ->
        if error
          reject MySQLAdapter.wrapError 'unknown error', error
        else
          resolve()

  ## @override AdapterBase::addColumn
  addColumn: (model, column_property) ->
    new Promise (resolve, reject) =>
      model_class = @_connection.models[model]
      tableName = model_class.tableName
      sql = "ALTER TABLE `#{tableName}` ADD COLUMN `#{column_property._dbname}` #{_propertyToSQL column_property, @support_fractional_seconds}"
      @_query sql, (error) ->
        if error
          reject MySQLAdapter.wrapError 'unknown error', error
        else
          resolve()

  ## @override AdapterBase::createIndex
  createIndex: (model, index, callback) ->
    model_class = @_connection.models[model]
    tableName = model_class.tableName
    columns = []
    for column, order of index.columns
      columns.push "`#{column}` #{if order is -1 then 'DESC' else 'ASC'}"
    unique = if index.options.unique then 'UNIQUE ' else ''
    sql = "CREATE #{unique}INDEX `#{index.options.name}` ON `#{tableName}` (#{columns.join ','})"
    @_query sql, (error) ->
      return callback MySQLAdapter.wrapError 'unknown error', error if error
      callback null

  ## @override AdapterBase::createForeignKey
  createForeignKey: (model, column, type, references, callback) ->
    model_class = @_connection.models[model]
    tableName = model_class.tableName
    action = switch type
      when 'nullify' then 'SET NULL'
      when 'restrict' then 'RESTRICT'
      when 'delete' then 'CASCADE'
    sql = "ALTER TABLE `#{tableName}` ADD FOREIGN KEY (`#{column}`) REFERENCES `#{references.tableName}`(id) ON DELETE #{action}"
    @_query sql, (error) ->
      if error
        return callback MySQLAdapter.wrapError 'unknown error', error
      callback null

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
      try
        JSON.parse value
      catch
        null
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
    else if value?.$inc?
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

  ## @override AdapterBase::upsert
  upsert: (model, data, conditions, options, callback) ->
    tableName = @_connection.models[model].tableName

    insert_data = {}
    for key, value of data
      if value?.$inc?
        insert_data[key] = value.$inc
      else
        insert_data[key] = value
    for condition in conditions
      for key, value of condition
        insert_data[key] = value
    values = []
    [ fields, places ] = @_buildUpdateSet model, insert_data, values, true
    sql = "INSERT INTO `#{tableName}` (#{fields}) VALUES (#{places})"

    [ fields ] = @_buildPartialUpdateSet model, data, values
    sql += " ON DUPLICATE KEY UPDATE #{fields}"

    @_query sql, values, (error, result) ->
      return _processSaveError error, callback if error
      callback null

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
        callback null, @_convertToModelInstance model, result[0], options
      else if result?.length > 1
        callback new Error 'unknown error'
      else
        callback new Error 'not found'

  _buildSqlForFind: (model, conditions, options) ->
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
      sql += ' WHERE ' + @_buildWhere @_connection.models[model]._schema, conditions, params
    if options.group_by
      sql += ' GROUP BY ' + options.group_by.join ','
    if options.conditions_of_group.length > 0
      sql += ' HAVING ' + @_buildWhere options.group_fields, options.conditions_of_group, params
    if options?.orders.length > 0 or order_by
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
        return "`#{column}` #{order}"
      if order_by
        orders.push order_by
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
      return @_query "EXPLAIN #{sql}", params, (error, result) ->
        return callback error if error
        callback null, result
    @_query sql, params, (error, result) =>
      #console.log result
      return callback MySQLAdapter.wrapError 'unknown error', error if error
      if options.group_fields
        callback null, result.map (record) => @_convertToGroupInstance model, record, options.group_by, options.group_fields
      else
        callback null, result.map (record) => @_convertToModelInstance model, record, options

  ## @override AdapterBase::stream
  stream: (model, conditions, options) ->
    try
      [sql, params] = @_buildSqlForFind model, conditions, options
    catch e
      readable = new stream.Readable objectMode: true
      readable._read = ->
        readable.emit 'error', e
      return readable
    transformer = new stream.Transform objectMode: true
    transformer._transform = (record, encoding, callback) =>
      transformer.push @_convertToModelInstance model, record, options
      callback()
    @_query(sql, params).stream()
    .on 'error', (error) ->
      transformer.emit 'error', error
    .pipe transformer
    transformer

  ## @override AdapterBase::count
  count: (model, conditions, options, callback) ->
    params = []
    tableName = @_connection.models[model].tableName
    sql = "SELECT COUNT(*) AS count FROM `#{tableName}`"
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
      sql = "SELECT COUNT(*) AS count FROM (#{sql}) _sub"
    #console.log sql, params
    @_query sql, params, (error, result) =>
      return callback MySQLAdapter.wrapError 'unknown error', error if error
      return callback new Error 'unknown error' if result?.length isnt 1
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
  # @param {String} [settings.charset='utf8']
  # @param {String} [settings.collation='utf8_unicode_ci']
  # @param {Number} [settings.pool_size=10]
  # @nodejscallback
  connect: (settings, callback) ->
    # connect
    client = mysql.createConnection
      host: settings.host
      port: settings.port
      user: settings.user
      password: settings.password
      charset: settings.charset
    @_database = settings.database
    @_settings = settings
    client.connect (error) =>
      if error
        client.end()
        return callback MySQLAdapter.wrapError 'failed to connect', error
      @_createDatabase client, (error) =>
        if error
          client.end()
          return callback error
        @_checkFeatures client, (error) =>
          client.end()
          return callback error if error
          @_client = mysql.createPool
            host: settings.host
            port: settings.port
            user: settings.user
            password: settings.password
            charset: settings.charset
            database: settings.database
            connectionLimit: settings.pool_size or 10
          callback null

  # create database if not exist
  _createDatabase: (client, callback) ->
    # check database existence
    client.query "USE `#{@_database}`", (error) =>
      return callback null if not error

      if error.code is 'ER_BAD_DB_ERROR'
        client.query "CREATE DATABASE `#{@_database}`", (error) =>
          return callback MySQLAdapter.wrapError 'unknown error', error if error
          @_createDatabase client, callback
      else
        msg = if error.code is 'ER_DBACCESS_DENIED_ERROR' then "no access right to the database '#{@_database}'" else 'unknown error'
        callback MySQLAdapter.wrapError msg, error

  _checkFeatures: (client, callback) ->
    client.query "CREATE TABLE _temp (date DATETIME(10))", (error) =>
      if error.code is 'ER_PARSE_ERROR'
        # MySQL 5.6.4 below does not support fractional seconds
        @support_fractional_seconds = false
      else if error.code is 'ER_TOO_BIG_PRECISION'
        @support_fractional_seconds = true
      else
        return callback error
      callback null

  ## @override AdapterBase::close
  close: ->
    if @_client
      @_client.end()
    @_client = null

  ##
  # Exposes mysql module's query method
  query: ->
    @_client.query.apply @_client, arguments

module.exports = (connection) ->
  new MySQLAdapter connection
