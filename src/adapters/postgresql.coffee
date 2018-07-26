try
  pg = require 'pg'
catch e
  console.log 'Install pg module to use this adapter'
  process.exit 1

try
  QueryStream = require 'pg-query-stream'

SQLAdapterBase = require './sql_base'
types = require '../types'

_ = require 'lodash'
async = require 'async'
stream = require 'stream'

_typeToSQL = (property) ->
  if property.array
    return 'JSON'
  switch property.type_class
    when types.String then "VARCHAR(#{property.type.length or 255})"
    when types.Number then 'DOUBLE PRECISION'
    when types.Boolean then 'BOOLEAN'
    when types.Integer then 'INT'
    when types.GeoPoint then 'GEOMETRY(POINT)'
    when types.Date then 'TIMESTAMP WITHOUT TIME ZONE'
    when types.Object then 'JSON'
    when types.Text then 'TEXT'

_propertyToSQL = (property) ->
  type = _typeToSQL property
  if type
    if property.required
      type += ' NOT NULL'
    else
      type += ' NULL'
    return type

##
# Adapter for PostgreSQL
# @namespace adapter
class PostgreSQLAdapter extends SQLAdapterBase
  key_type: types.Integer
  support_geopoint: true
  support_string_type_with_length: true
  native_integrity: true
  _param_place_holder: (pos) -> '$' + pos
  _contains_op: 'ILIKE'
  _regexp_op: '~*'

  ##
  # Creates a PostgreSQL adapter
  constructor: (connection) ->
    super()
    @_connection = connection

  _query: (sql, data, callback) ->
    #console.log 'PostgreSQLAdapter:', sql
    @_pool.query sql, data, (error, result) ->
      callback error, result

  _getTables: (callback) ->
    @_query "SELECT table_name FROM INFORMATION_SCHEMA.TABLES WHERE table_schema = 'public' AND table_type = 'BASE TABLE'", null, (error, result) ->
      return callback error if error
      tables = result.rows.map (table) ->
        table.table_name
      callback null, tables

  _getSchema: (table, callback) ->
    @_query "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name=$1", [table], (error, result) =>
      return callback error if error
      schema = {}
      for column in result.rows
        type = if column.data_type is 'character varying'
          new types.String(column.character_maximum_length)
        else if column.data_type is 'double precision'
          new types.Number()
        else if column.data_type is 'boolean'
          new types.Boolean()
        else if column.data_type is 'integer'
          new types.Integer()
        else if column.data_type is 'USER-DEFINED' and column.udt_schema is 'public' and column.udt_name is 'geometry'
          new types.GeoPoint()
        else if column.data_type is 'timestamp without time zone'
          new types.Date()
        else if column.data_type is 'json'
          new types.Object()
        else if column.data_type is 'text'
          new types.Text()
        schema[column.column_name] = type: type, required: column.is_nullable is 'NO'
      callback null, schema

  _getIndexes: (callback) ->
    # see http://stackoverflow.com/a/2213199/3239514
    @_query "SELECT t.relname AS table_name, i.relname AS index_name, a.attname AS column_name FROM pg_class t, pg_class i, pg_index ix, pg_attribute a WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)", null, (error, result) ->
      return callback error if error
      indexes = {}
      for row in result.rows
        indexes_of_table = indexes[row.table_name] or= {}
        (indexes_of_table[row.index_name] or= {})[row.column_name] = 1
      callback null, indexes

  _getForeignKeys: (callback) ->
    # see http://stackoverflow.com/a/1152321/3239514
    @_query "SELECT tc.table_name AS table_name, kcu.column_name AS column_name, ccu.table_name AS referenced_table_name FROM information_schema.table_constraints AS tc JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name WHERE constraint_type = 'FOREIGN KEY'", null, (error, result) ->
      return callback error if error
      foreign_keys = {}
      for row in result.rows
        foreign_keys_of_table = foreign_keys[row.table_name] or= {}
        foreign_keys_of_table[row.column_name] = row.referenced_table_name
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
  createTable: (model, callback) ->
    new Promise (resolve, reject) =>
      model_class = @_connection.models[model]
      tableName = model_class.tableName
      sql = []
      sql.push 'id SERIAL PRIMARY KEY'
      for column, property of model_class._schema
        column_sql = _propertyToSQL property
        if column_sql
          sql.push "\"#{property._dbname}\" #{column_sql}"
      sql = "CREATE TABLE \"#{tableName}\" ( #{sql.join ','} )"
      @_query sql, null, (error) =>
        if error
          reject PostgreSQLAdapter.wrapError 'unknown error', error
        else
          resolve()

  ## @override AdapterBase::addColumn
  addColumn: (model, column_property) ->
    new Promise (resolve, reject) =>
      model_class = @_connection.models[model]
      tableName = model_class.tableName
      sql = "ALTER TABLE \"#{tableName}\" ADD COLUMN \"#{column_property._dbname}\" #{_propertyToSQL column_property}"
      @_query sql, null, (error) ->
        if error
          reject PostgreSQLAdapter.wrapError 'unknown error', error
        else
          resolve()

  ## @override AdapterBase::createIndex
  createIndex: (model, index, callback) ->
    model_class = @_connection.models[model]
    tableName = model_class.tableName
    columns = []
    for column, order of index.columns
      columns.push "\"#{column}\" #{if order is -1 then 'DESC' else 'ASC'}"
    unique = if index.options.unique then 'UNIQUE ' else ''
    sql = "CREATE #{unique}INDEX \"#{index.options.name}\" ON \"#{tableName}\" (#{columns.join ','})"
    @_query sql, null, (error) =>
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      callback null

  ## @override AdapterBase::createForeignKey
  createForeignKey: (model, column, type, references, callback) ->
    model_class = @_connection.models[model]
    tableName = model_class.tableName
    action = switch type
      when 'nullify' then 'SET NULL'
      when 'restrict' then 'RESTRICT'
      when 'delete' then 'CASCADE'
    sql = "ALTER TABLE \"#{tableName}\" ADD FOREIGN KEY (\"#{column}\") REFERENCES \"#{references.tableName}\"(id) ON DELETE #{action}"
    @_query sql, null, (error) ->
      if error
        return callback MySQLAdapter.wrapError 'unknown error', error
      callback null

  ## @override AdapterBase::drop
  drop: (model, callback) ->
    tableName = @_connection.models[model].tableName
    @_query "DROP TABLE IF EXISTS \"#{tableName}\"", null, (error) ->
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      callback null

  _getModelID: (data) ->
    Number data.id

  valueToModel: (value, property) ->
    value

  _processSaveError = (tableName, error, callback) ->
    if error.code is '42P01'
      error = new Error('table does not exist')
    else if error.code is '23505'
      column = ''
      key = error.message.match /unique constraint \"(.*)\"/
      if key?
        column = key[1]
        key = column.match new RegExp "#{tableName}_([^']*)_key"
        if key?
          column = key[1]
        column = ' ' + column
      error = new Error('duplicated' + column)
    else
      error = PostgreSQLAdapter.wrapError 'unknown error', error
    callback error

  _buildSelect: (model_class, select) ->
    if not select
      select = Object.keys(model_class._schema)
    if select.length>0
      schema = model_class._schema
      escape_ch = @_escape_ch
      select = select.map (column) ->
        property = schema[column]
        column = escape_ch + schema[column]._dbname + escape_ch
        if property.type_class is types.GeoPoint
          "ARRAY[ST_X(#{column}), ST_Y(#{column})] AS #{column}"
        else
          column
      return 'id,' + select.join ','
    else
      return 'id'

  _buildUpdateSetOfColumn: (property, data, values, fields, places, insert) ->
    dbname = property._dbname
    value = data[dbname]
    if property.type_class is types.GeoPoint
      values.push value[0]
      values.push value[1]
      if insert
        fields.push "\"#{dbname}\""
        places.push "ST_Point($#{values.length-1}, $#{values.length})"
      else
        fields.push "\"#{dbname}\"=ST_Point($#{values.length-1}, $#{values.length})"
    else if value?.$inc?
      values.push value.$inc
      fields.push "\"#{dbname}\"=\"#{dbname}\"+$#{values.length}"
    else
      values.push value
      if insert
        fields.push "\"#{dbname}\""
        places.push '$' + values.length
      else
        fields.push "\"#{dbname}\"=$#{values.length}"

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
    sql = "INSERT INTO \"#{tableName}\" (#{fields}) VALUES (#{places}) RETURNING id"
    @_query sql, values, (error, result) ->
      rows = result?.rows
      return _processSaveError tableName, error, callback if error
      if rows?.length is 1 and rows[0].id?
        callback null, rows[0].id
      else
        callback new Error 'unexpected rows'

  ## @override AdapterBase::createBulk
  createBulk: (model, data, callback) ->
    tableName = @_connection.models[model].tableName
    values = []
    fields = undefined
    places = []
    data.forEach (item) =>
      [ fields, places_sub ] = @_buildUpdateSet model, item, values, true
      places.push '(' + places_sub + ')'
    sql = "INSERT INTO \"#{tableName}\" (#{fields}) VALUES #{places.join ','} RETURNING id"
    @_query sql, values, (error, result) ->
      return _processSaveError tableName, error, callback if error
      ids = result?.rows.map (row) -> row.id
      if ids.length is data.length
        callback null, ids
      else
        callback new Error 'unexpected rows'

  ## @override AdapterBase::update
  update: (model, data, callback) ->
    tableName = @_connection.models[model].tableName
    values = []
    [ fields ] = @_buildUpdateSet model, data, values
    values.push data.id
    sql = "UPDATE \"#{tableName}\" SET #{fields} WHERE id=$#{values.length}"
    @_query sql, values, (error) ->
      return _processSaveError tableName, error, callback if error
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
    @_query sql, values, (error, result) ->
      return _processSaveError tableName, error, callback if error
      callback null, result.rowCount

  ## @override AdapterBase::findById
  findById: (model, id, options, callback) ->
    select = @_buildSelect @_connection.models[model], options.select
    tableName = @_connection.models[model].tableName
    sql = "SELECT #{select} FROM \"#{tableName}\" WHERE id=$1 LIMIT 1"
    if options.explain
      return @_query "EXPLAIN #{sql}", [id], (error, result) ->
        return callback error if error
        callback null, result
    @_query sql, [id], (error, result) =>
      rows = result?.rows
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      if rows?.length is 1
        callback null, @_convertToModelInstance model, rows[0], options
      else if rows?.length > 1
        callback new Error 'unknown error'
      else
        callback new Error 'not found'

  _buildSqlForFind: (model, conditions, options) ->
    if options.group_by or options.group_fields
      select = @_buildGroupFields options.group_by, options.group_fields
    else
      select = @_buildSelect @_connection.models[model], options.select
    if options.near? and field = Object.keys(options.near)[0]
      order_by = "\"#{field}_distance\""
      location = options.near[field]
      select += ",ST_Distance(\"#{field}\",ST_Point(#{location[0]},#{location[1]})) AS \"#{field}_distance\""
    params = []
    tableName = @_connection.models[model].tableName
    sql = "SELECT #{select} FROM \"#{tableName}\""
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
        return "\"#{column}\" #{order}"
      if order_by
        orders.push order_by
      sql += ' ORDER BY ' + orders.join ','
    if options?.limit?
      sql += ' LIMIT ' + options.limit
      sql += ' OFFSET ' + options.skip if options?.skip?
    else if options?.skip?
      sql += ' LIMIT ALL OFFSET ' + options.skip
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
      rows = result?.rows
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      if options.group_fields
        callback null, rows.map (record) => @_convertToGroupInstance model, record, options.group_by, options.group_fields
      else
        callback null, rows.map (record) => @_convertToModelInstance model, record, options

  ## @override AdapterBase::stream
  stream: (model, conditions, options, callback) ->
    if not QueryStream
      console.log 'Install pg-query-stream module to use stream'
      process.exit 1
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
    @_pool.connect()
    .then (client) ->
      client.query new QueryStream sql, params
      .on 'end', ->
        client.release()
      .on 'error', (error) ->
        transformer.emit 'error', error
      .pipe transformer
    transformer

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
      sql = "SELECT COUNT(*) AS count FROM (#{sql}) _sub"
    #console.log sql, params
    @_query sql, params, (error, result) =>
      rows = result?.rows
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      return callback new Error 'unknown error' if rows?.length isnt 1
      callback null, Number(rows[0].count)

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
    @_query sql, params, (error, result) ->
      return callback new Error 'rejected' if error and error.code is '23503'
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error or not result?
      callback null, result.rowCount

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
    pool = new pg.Pool
      host: settings.host
      port: settings.port
      user: settings.user
      password: settings.password
      database: settings.database

    pool.connect()
    .then (client) =>
      client.release()
      @_pool = pool
      return callback null
    .catch (error) ->
      if error.code is '3D000'
        return callback new Error 'database does not exist'
      return callback PostgreSQLAdapter.wrapError 'failed to connect', error

  ## @override AdapterBase::close
  close: ->
    @_pool.end()
    @_pool = null

  ##
  # Exposes pg module's query method
  query: ->
    @_pool.query.apply @_pool, arguments

module.exports = (connection) ->
  new PostgreSQLAdapter connection
