try
  mysql = require 'mysql'
catch e
  console.log 'Install mysql module to use this adapter'
  process.exit 1

AdapterBase = require './base'

async = require 'async'

_typeToSQL = (property) ->
  switch property.type
    when String then 'VARCHAR(255)'
    when Number then 'INT(11)'

_propertyToSQL = (property) ->
  type = _typeToSQL property
  if type
    return type + ' NULL'

###
# Adapter for MySQL
# @param {mysql.Connection} client
###
class MySQLAdapter extends AdapterBase
  constructor: (connection, client) ->
    @_connection = connection
    @_client = client

  _query: (sql, data, callback) ->
    @_client.query sql, data, callback

  _createTable: (model, callback) ->
    table = MySQLAdapter.toCollectionName model
    sql = []
    sql.push 'id BIGINT NOT NULL AUTO_INCREMENT UNIQUE PRIMARY KEY'
    for field, property of @_connection.models[model]._schema
      field_sql = _propertyToSQL property
      if field_sql
        sql.push field + ' ' + field_sql
    sql = "CREATE TABLE #{table} ( #{sql.join ','} )"
    @_query sql, (error, result) ->
      return callback MySQLAdapter.wrapError 'unknown error', error if error
      callback null

  _alterTable: (model, fields, callback) ->
    # TODO
    callback null

  _applySchema: (model, callback) ->
    table = MySQLAdapter.toCollectionName model
    @_query "SHOW FIELDS FROM #{table}", (error, fields) =>
      if error?.code is 'ER_NO_SUCH_TABLE'
        @_createTable model, callback
      else
        @_alterTable model, fields, callback

  applySchemas: (callback) ->
    async.forEach Object.keys(@_connection.models), (model, callback) =>
        @_applySchema model, callback
      , (error) ->
        callback error

  drop: (model, callback) ->
    table = MySQLAdapter.toCollectionName model
    @_query "DROP TABLE IF EXISTS #{table}", (error) ->
      return callback MySQLAdapter.wrapError 'unknown error', error if error
      callback null

  deleteAll: (model, callback) ->
    table = MySQLAdapter.toCollectionName model
    @_query "DELETE FROM #{table}", (error) ->
      return callback MySQLAdapter.wrapError 'unknown error', error if error
      callback null

  ###
  # Create a record
  # @param {String} model
  # @param {Object} data
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {String} callback.id
  ###
  create: (model, data, callback) ->
    table = MySQLAdapter.toCollectionName model
    @_query "INSERT INTO #{table} SET ?", data, (error, result) ->
      return callback MySQLAdapter.wrapError 'unknown error', error if error
      if result?.insertId
        callback null, result.insertId
      else
        callback new Error 'unexpected result'

  _convertToModelInstance: (model, data) ->
    data.id = Number(data.id)
    return data

  findById: (model, id, callback) ->
    table = MySQLAdapter.toCollectionName model
    @_query "SELECT * FROM #{table} WHERE id=? LIMIT 1", id, (error, result) =>
      return callback MySQLAdapter.wrapError 'unknown error', error if error
      if result?.length is 1
        callback null, @_convertToModelInstance model, result[0]
      else
        callback new Error 'unknown error'

###
# Initialize MySQL adapter
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
module.exports = (connection, settings, callback) ->
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
