try
  pg = require 'pg'
catch e
  console.log 'Install pg module to use this adapter'
  process.exit 1

SQLAdapterBase = require './sql_base'
types = require '../types'
tableize = require('../inflector').tableize
async = require 'async'
_ = require 'underscore'

_typeToSQL = (property) ->
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
    table = tableize model
    sql = []
    sql.push 'id SERIAL PRIMARY KEY'
    for column, property of @_connection.models[model]._schema
      column_sql = _propertyToSQL property
      if column_sql
        sql.push property._dbname + ' ' + column_sql
    sql = "CREATE TABLE #{table} ( #{sql.join ','} )"
    @_query sql, (error) ->
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      callback null

  _alterTable: (model, columns, callback) ->
    # TODO
    callback null

  ## @override AdapterBase::applySchema
  applySchema: (model, callback) ->
    table = tableize model
    @_query "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name=$1", [table], (error, result) =>
      columns = result?.rows
      if error or columns.length is 0
        @_createTable model, callback
      else
        @_alterTable model, columns, callback

  ## @override AdapterBase::drop
  drop: (model, callback) ->
    table = tableize model
    @_query "DROP TABLE IF EXISTS #{table}", (error) ->
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      callback null

  _getModelID: (data) ->
    Number data.id

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
    values = []
    [ fields, places ] = @_buildUpdateSet model, data, values, true
    sql = "INSERT INTO #{tableize model} (#{fields}) VALUES (#{places}) RETURNING id"
    @_query sql, values, (error, result) ->
      rows = result?.rows
      return _processSaveError model, error, callback if error
      if rows?.length is 1 and rows[0].id?
        callback null, rows[0].id
      else
        callback new Error 'unexpected rows'

  ## @override AdapterBase::createBulk
  createBulk: (model, data, callback) ->
    values = []
    fields = undefined
    places = []
    data.forEach (item) =>
      [ fields, places_sub ] = @_buildUpdateSet model, item, values, true
      places.push '(' + places_sub + ')'
    sql = "INSERT INTO #{tableize model} (#{fields}) VALUES #{places.join ','} RETURNING id"
    @_query sql, values, (error, result) ->
      return _processSaveError model, error, callback if error
      ids = result?.rows.map (row) -> row.id
      if ids.length is data.length
        callback null, ids
      else
        callback new Error 'unexpected rows'

  ## @override AdapterBase::update
  update: (model, data, callback) ->
    values = []
    [ fields ] = @_buildUpdateSet model, data, values
    values.push data.id
    sql = "UPDATE #{tableize model} SET #{fields} WHERE id=$#{values.length}"
    @_query sql, values, (error) ->
      return _processSaveError model, error, callback if error
      callback null

  ## @override AdapterBase::updatePartial
  updatePartial: (model, data, conditions, options, callback) ->
    values = []
    [ fields ] = @_buildPartialUpdateSet model, data, values
    sql = "UPDATE #{tableize model} SET #{fields}"
    if conditions.length > 0
      sql += ' WHERE ' + @_buildWhere conditions, values
    @_query sql, values, (error, result) ->
      return _processSaveError model, error, callback if error
      callback null, result.rowCount

  ## @override AdapterBase::findById
  findById: (model, id, options, callback) ->
    if options.select
      selects = 'id,' + options.select.join ','
    else
      selects = '*'
    table = tableize model
    @_query "SELECT #{selects} FROM #{table} WHERE id=$1 LIMIT 1", [id], (error, result) =>
      rows = result?.rows
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      if rows?.length is 1
        callback null, @_convertToModelInstance model, rows[0]
      else if rows?.length > 1
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
    @_query sql, params, (error, result) =>
      rows = result?.rows
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      callback null, rows.map (record) => @_convertToModelInstance model, record

  ## @override AdapterBase::count
  count: (model, conditions, callback) ->
    params = []
    sql = "SELECT COUNT(*) AS count FROM #{tableize model}"
    if conditions.length > 0
      sql += ' WHERE ' + @_buildWhere conditions, params
    #console.log sql, params
    @_query sql, params, (error, result) =>
      rows = result?.rows
      return callback PostgreSQLAdapter.wrapError 'unknown error', error if error
      return callback error 'unknown error' if rows?.length isnt 1
      callback null, Number(rows[0].count)

  ## @override AdapterBase::delete
  delete: (model, conditions, callback) ->
    params = []
    sql = "DELETE FROM #{tableize model}"
    if conditions.length > 0
      sql += ' WHERE ' + @_buildWhere conditions, params
    #console.log sql, params
    @_query sql, params, (error, result) ->
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
      , (error, client) =>
        if error?.code is '3D000'
          return callback new Error 'database does not exist'
        return callback PostgreSQLAdapter.wrapError 'failed to connect', error if error

        @_client = client
        return callback null

module.exports = (connection) ->
  new PostgreSQLAdapter connection
