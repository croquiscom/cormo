try
  mysql = require 'mysql'
catch error
  console.log 'Install mysql module to use this adapter'
  process.exit 1

_wrapError = (msg, cause) ->
  error = new Error msg
  error.cause = cause
  return error

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
    return callback _wrapError 'failed to connect', error if error

    # select database
    client.query "USE `#{settings.database}`", (error) ->
      return callback null if not error

      # create one if not exist
      if error.code is 'ER_BAD_DB_ERROR'
        client.query "CREATE DATABASE `#{settings.database}`", (error) ->
          return callback _wrapError 'unknown error', error if error
          return callback null
      else
        msg = if error.code is 'ER_DBACCESS_DENIED_ERROR' then "no access right to the database '#{settings.database}'" else 'unknown error'
        callback _wrapError msg, error
