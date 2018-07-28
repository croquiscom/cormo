try
  mysql = require 'mysql'
catch e
  console.log 'Install mysql module to use this adapter'
  process.exit 1

SQLAdapterBase = require './sql_base'
types = require '../types'

_ = require 'lodash'
stream = require 'stream'
util = require 'util'

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

_processSaveError = (error) ->
  if error.code is 'ER_NO_SUCH_TABLE'
    return new Error('table does not exist')
  else if error.code is 'ER_DUP_ENTRY'
    key = error.message.match /for key '([^']*)'/
    return new Error('duplicated ' + key?[1])
  else if error.code is 'ER_BAD_NULL_ERROR'
    key = error.message.match /Column '([^']*)'/
    return new Error("'#{key?[1]}' is required")
  else
    return MySQLAdapter.wrapError 'unknown error', error

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

  _getTables: ->
    tables = await @_client.queryAsync "SHOW TABLES"
    tables = tables.map (table) ->
      key = Object.keys(table)[0]
      table[key]
    tables

  _getSchema: (table) ->
    columns = await @_client.queryAsync "SHOW COLUMNS FROM `#{table}`"
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
    schema

  _getIndexes: ->
    rows = await @_client.queryAsync "SELECT * FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? ORDER BY SEQ_IN_INDEX", [@_database]
    indexes = {}
    for row in rows
      indexes_of_table = indexes[row.TABLE_NAME] or= {}
      (indexes_of_table[row.INDEX_NAME] or= {})[row.COLUMN_NAME] = 1
    indexes

  _getForeignKeys: ->
    rows = await @_client.queryAsync "SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME IS NOT NULL AND CONSTRAINT_SCHEMA = ?", [@_database]
    foreign_keys = {}
    for row in rows
      foreign_keys_of_table = foreign_keys[row.TABLE_NAME] or= {}
      foreign_keys_of_table[row.COLUMN_NAME] = row.REFERENCED_TABLE_NAME
    foreign_keys

  ## @override AdapterBase::getSchemas
  getSchemas: () ->
    tables = await @_getTables()
    table_schemas = {}
    for table in tables
      table_schemas[table] = await @_getSchema table
    indexes = await @_getIndexes()
    foreign_keys = await @_getForeignKeys()
    return tables: table_schemas, indexes: indexes, foreign_keys: foreign_keys

  ## @override AdapterBase::createTable
  createTable: (model) ->
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
    try
      await @_client.queryAsync sql
    catch error
      throw MySQLAdapter.wrapError 'unknown error', error
    return

  ## @override AdapterBase::addColumn
  addColumn: (model, column_property) ->
    model_class = @_connection.models[model]
    tableName = model_class.tableName
    sql = "ALTER TABLE `#{tableName}` ADD COLUMN `#{column_property._dbname}` #{_propertyToSQL column_property, @support_fractional_seconds}"
    try
      await @_client.queryAsync sql
    catch error
      throw MySQLAdapter.wrapError 'unknown error', error
    return

  ## @override AdapterBase::createIndex
  createIndex: (model, index) ->
    model_class = @_connection.models[model]
    tableName = model_class.tableName
    columns = []
    for column, order of index.columns
      columns.push "`#{column}` #{if order is -1 then 'DESC' else 'ASC'}"
    unique = if index.options.unique then 'UNIQUE ' else ''
    sql = "CREATE #{unique}INDEX `#{index.options.name}` ON `#{tableName}` (#{columns.join ','})"
    try
      await @_client.queryAsync sql
    catch error
      throw MySQLAdapter.wrapError 'unknown error', error
    return

  ## @override AdapterBase::createForeignKey
  createForeignKey: (model, column, type, references) ->
    model_class = @_connection.models[model]
    tableName = model_class.tableName
    action = switch type
      when 'nullify' then 'SET NULL'
      when 'restrict' then 'RESTRICT'
      when 'delete' then 'CASCADE'
    sql = "ALTER TABLE `#{tableName}` ADD FOREIGN KEY (`#{column}`) REFERENCES `#{references.tableName}`(id) ON DELETE #{action}"
    try
      await @_client.queryAsync sql
    catch error
      throw MySQLAdapter.wrapError 'unknown error', error
    return

  ## @override AdapterBase::drop
  drop: (model) ->
    tableName = @_connection.models[model].tableName
    try
      await @_client.queryAsync "DROP TABLE IF EXISTS `#{tableName}`"
    catch error
      throw MySQLAdapter.wrapError 'unknown error', error
    return

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
  create: (model, data) ->
    tableName = @_connection.models[model].tableName
    values = []
    [ fields, places ] = @_buildUpdateSet model, data, values, true
    sql = "INSERT INTO `#{tableName}` (#{fields}) VALUES (#{places})"
    try
      result = await @_client.queryAsync sql, values
    catch error
      throw _processSaveError error
    if id = result?.insertId
      return id
    else
      throw new Error 'unexpected result'

  ## @override AdapterBase::createBulk
  createBulk: (model, data) ->
    tableName = @_connection.models[model].tableName
    values = []
    fields = undefined
    places = []
    data.forEach (item) =>
      [ fields, places_sub ] = @_buildUpdateSet model, item, values, true
      places.push '(' + places_sub + ')'
    sql = "INSERT INTO `#{tableName}` (#{fields}) VALUES #{places.join ','}"
    try
      result = await @_client.queryAsync sql, values
    catch error
      throw _processSaveError error
    if id = result?.insertId
      return data.map (item, i) -> id + i
    else
      throw new Error 'unexpected result'

  ## @override AdapterBase::update
  update: (model, data) ->
    tableName = @_connection.models[model].tableName
    values = []
    [ fields ] = @_buildUpdateSet model, data, values
    values.push data.id
    sql = "UPDATE `#{tableName}` SET #{fields} WHERE id=?"
    try
      await @_client.queryAsync sql, values
    catch error
      throw _processSaveError error
    return

  ## @override AdapterBase::updatePartial
  updatePartial: (model, data, conditions, options) ->
    tableName = @_connection.models[model].tableName
    values = []
    [ fields ] = @_buildPartialUpdateSet model, data, values
    sql = "UPDATE `#{tableName}` SET #{fields}"
    if conditions.length > 0
      try
        sql += ' WHERE ' + @_buildWhere @_connection.models[model]._schema, conditions, values
      catch e
        return callback e
    try
      result = await @_client.queryAsync sql, values
    catch error
      throw _processSaveError error
    if not result?
      throw MySQLAdapter.wrapError 'unknown error'
    return result.affectedRows

  ## @override AdapterBase::upsert
  upsert: (model, data, conditions, options) ->
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

    try
      await @_client.queryAsync sql, values
    catch error
      throw _processSaveError error
    return

  ## @override AdapterBase::findById
  findById: (model, id, options) ->
    id = @_convertValueType id, @key_type
    select = @_buildSelect @_connection.models[model], options.select
    tableName = @_connection.models[model].tableName
    sql = "SELECT #{select} FROM `#{tableName}` WHERE id=? LIMIT 1"
    if options.explain
      return await @_client.queryAsync "EXPLAIN #{sql}", id
    try
      result = await @_client.queryAsync sql, id
    catch error
      throw MySQLAdapter.wrapError 'unknown error', error
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
  find: (model, conditions, options) ->
    [sql, params] = @_buildSqlForFind model, conditions, options
    if options.explain
      return await @_client.queryAsync "EXPLAIN #{sql}", params
    try
      result = await @_client.queryAsync sql, params
    catch error
      throw MySQLAdapter.wrapError 'unknown error', error
    #console.log result
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
    transformer = new stream.Transform objectMode: true
    transformer._transform = (record, encoding, callback) =>
      transformer.push @_convertToModelInstance model, record, options
      callback()
    @_client.query(sql, params).stream()
    .on 'error', (error) ->
      transformer.emit 'error', error
    .pipe transformer
    transformer

  ## @override AdapterBase::count
  count: (model, conditions, options) ->
    params = []
    tableName = @_connection.models[model].tableName
    sql = "SELECT COUNT(*) AS count FROM `#{tableName}`"
    if conditions.length > 0
      sql += ' WHERE ' + @_buildWhere @_connection.models[model]._schema, conditions, params
    if options.group_by
      sql += ' GROUP BY ' + options.group_by.join ','
      if options.conditions_of_group.length > 0
        sql += ' HAVING ' + @_buildWhere options.group_fields, options.conditions_of_group, params
      sql = "SELECT COUNT(*) AS count FROM (#{sql}) _sub"
    #console.log sql, params
    try
      result = await @_client.queryAsync sql, params
    catch error
      throw MySQLAdapter.wrapError 'unknown error', error
    if result?.length isnt 1
      throw new Error 'unknown error'
    return Number(result[0].count)

  ## @override AdapterBase::delete
  delete: (model, conditions) ->
    params = []
    tableName = @_connection.models[model].tableName
    sql = "DELETE FROM `#{tableName}`"
    if conditions.length > 0
      sql += ' WHERE ' + @_buildWhere @_connection.models[model]._schema, conditions, params
    #console.log sql, params
    try
      result = await @_client.queryAsync sql, params
    catch error
      if error and error.code in ['ER_ROW_IS_REFERENCED_', 'ER_ROW_IS_REFERENCED_2']
        throw new Error 'rejected'
        return
      throw MySQLAdapter.wrapError 'unknown error', error
    if not result?
      throw MySQLAdapter.wrapError 'unknown error'
    return result.affectedRows

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
  connect: (settings) ->
    # connect
    client = mysql.createConnection
      host: settings.host
      port: settings.port
      user: settings.user
      password: settings.password
      charset: settings.charset
    client.connectAsync = util.promisify client.connect
    client.queryAsync = util.promisify client.query
    @_database = settings.database
    @_settings = settings
    try
      await client.connectAsync()
    catch error
      client.end()
      throw MySQLAdapter.wrapError 'failed to connect', error
    try
      await @_createDatabase client
    catch error
      client.end()
      throw error
    try
      await @_checkFeatures client
    finally
      client.end()
    @_client = mysql.createPool
      host: settings.host
      port: settings.port
      user: settings.user
      password: settings.password
      charset: settings.charset
      database: settings.database
      connectionLimit: settings.pool_size or 10
    @_client.queryAsync = util.promisify @_client.query
    return

  # create database if not exist
  _createDatabase: (client) ->
    # check database existence
    try
      await client.queryAsync "USE `#{@_database}`"
    catch error
      if error.code is 'ER_BAD_DB_ERROR'
        try
          await client.queryAsync "CREATE DATABASE `#{@_database}`"
        catch error
          throw MySQLAdapter.wrapError 'unknown error', error
        await @_createDatabase client
      else
        msg = if error.code is 'ER_DBACCESS_DENIED_ERROR' then "no access right to the database '#{@_database}'" else 'unknown error'
        throw MySQLAdapter.wrapError msg, error

  _checkFeatures: (client) ->
    try
      await client.queryAsync "CREATE TABLE _temp (date DATETIME(10))"
    catch error
      if error.code is 'ER_PARSE_ERROR'
        # MySQL 5.6.4 below does not support fractional seconds
        @support_fractional_seconds = false
      else if error.code is 'ER_TOO_BIG_PRECISION'
        @support_fractional_seconds = true
      else
        throw error
    return

  ## @override AdapterBase::close
  close: ->
    if @_client
      @_client.end()
    @_client = null

  ##
  # Exposes mysql module's query method
  query: ->
    @_client.queryAsync.apply @_client, arguments

module.exports = (connection) ->
  new MySQLAdapter connection
