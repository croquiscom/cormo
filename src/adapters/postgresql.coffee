try
  pg = require 'pg'
catch e
  console.log 'Install pg module to use this adapter'
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
    when types.Number then 'DOUBLE PRECISION'
    when types.Boolean then 'BOOLEAN'
    when types.Integer then 'INT'
    when types.Date then 'TIMESTAMP WITHOUT TIME ZONE'
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
# Adapter for PostgreSQL
# @namespace adapter
class PostgreSQLAdapter extends SQLAdapterBase
  key_type: types.Integer
  native_integrity: true
  _param_place_holder: (pos) -> '$' + pos
  _contains_op: 'ILIKE'

  ##
  # Creates a PostgreSQL adapter
  constructor: (connection) ->
    @_connection = connection

  _query: (sql, data, callback) ->
    #console.log 'PostgreSQLAdapter:', sql
    @_client.query sql, data, (error, result) ->
      callback error, result

  _createTable: (model, callback) ->
    model_class = @_connection.models[model]
    tableName = model_class.tableName
    sql = []
    sql.push 'id SERIAL PRIMARY KEY'
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
    @_query sql, null, (error) =>
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      async.forEach model_class._indexes, (index, callback) =>
        columns = []
        for column, order of index.columns
          order = if order is -1 then 'DESC' else 'ASC'
          columns.push column + ' ' + order
        unique = if index.options.unique then 'UNIQUE ' else ''
        sql = "CREATE #{unique}INDEX #{index.options.name} ON #{tableName} (#{columns.join ','})"
        @_query sql, null, callback
      , (error) ->
        return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
        callback null

  _alterTable: (model, columns, callback) ->
    # TODO
    callback null

  ## @override AdapterBase::applySchema
  applySchema: (model, callback) ->
    tableName = @_connection.models[model].tableName
    @_query "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name=$1", [tableName], (error, result) =>
      columns = result?.rows
      if error or columns.length is 0
        @_createTable model, callback
      else
        @_alterTable model, columns, callback

  ## @override AdapterBase::drop
  drop: (model, callback) ->
    tableName = @_connection.models[model].tableName
    @_query "DROP TABLE IF EXISTS #{tableName}", null, (error) ->
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      callback null

  _getModelID: (data) ->
    Number data.id

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

  _buildUpdateSetOfColumn: (property, data, values, fields, places, insert) ->
    dbname = property._dbname
    values.push data[dbname]
    if insert
      fields.push dbname
      places.push '$' + values.length
    else
      fields.push dbname + '=$' + values.length

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
    sql = "INSERT INTO #{tableName} (#{fields}) VALUES (#{places}) RETURNING id"
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
    sql = "INSERT INTO #{tableName} (#{fields}) VALUES #{places.join ','} RETURNING id"
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
    sql = "UPDATE #{tableName} SET #{fields} WHERE id=$#{values.length}"
    @_query sql, values, (error) ->
      return _processSaveError tableName, error, callback if error
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
    @_query sql, values, (error, result) ->
      return _processSaveError tableName, error, callback if error
      callback null, result.rowCount

  ## @override AdapterBase::findById
  findById: (model, id, options, callback) ->
    select = @_buildSelect @_connection.models[model], options.select
    tableName = @_connection.models[model].tableName
    @_query "SELECT #{select} FROM #{tableName} WHERE id=$1 LIMIT 1", [id], (error, result) =>
      rows = result?.rows
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      if rows?.length is 1
        if options.lean
          callback null, @_refineRawInstance model, rows[0], options.select
        else
          callback null, @_convertToModelInstance model, rows[0], options.select
      else if rows?.length > 1
        callback new Error 'unknown error'
      else
        callback new Error 'not found'

  ## @override AdapterBase::find
  find: (model, conditions, options, callback) ->
    if options.group_by or options.group_fields
      select = @_buildGroupFields options.group_by, options.group_fields
    else
      select = @_buildSelect @_connection.models[model], options.select
    params = []
    tableName = @_connection.models[model].tableName
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
      sql += ' LIMIT ALL OFFSET ' + options.skip
    #console.log sql, params
    @_query sql, params, (error, result) =>
      rows = result?.rows
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      if options.group_fields
        callback null, rows.map (record) => @_convertToGroupInstance model, record, options.group_by, options.group_fields
      else
        if options.lean
          callback null, rows.map (record) => @_refineRawInstance model, record, options.select
        else
          callback null, rows.map (record) => @_convertToModelInstance model, record, options.select

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
    @_query sql, params, (error, result) =>
      rows = result?.rows
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      return callback error 'unknown error' if rows?.length isnt 1
      callback null, Number(rows[0].count)

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
  # @param {Function} callback
  # @param {Error} callback.error
  connect: (settings, callback) ->
    # connect
    pg.connect
      host: settings.host
      port: settings.port
      user: settings.user
      password: settings.password
      database: settings.database
    , (error, client, done) =>
      if error?.code is '3D000'
        return callback new Error 'database does not exist'
      return callback PostgreSQLAdapter.wrapError 'failed to connect', error if error

      @_client = client
      @_client_done = done
      return callback null

  ## @override AdapterBase::close
  close: ->
    if @_client_done
      @_client_done()
      @_client_done = null
    @_client = null

module.exports = (connection) ->
  new PostgreSQLAdapter connection
