try
  mongodb = require 'mongodb'
catch error
  console.log 'Install mongodb module to use this adapter'
  process.exit 1

_wrapError = (msg, cause) ->
  error = new Error msg
  error.cause = cause
  return error

###
# Initialize MongoDB adapter
# @param {Connection} connection
# @param {Object} settings
# @param {String} [settings.host]
# @param {Number} [settings.port]
# @param {String} settings.database
# @param {Function} callback
# @param {Error} callback.error
# @param {MongoDBAdapter} callback.adapter
###
module.exports = (connection, settings, callback) ->
  server = new mongodb.Server settings.host or 'localhost', settings.port or 27017, {}
  db = new mongodb.Db settings.database, server, {}
  db.open (error, collection) ->
    return callback _wrapError 'unknown error', error if error
    callback null
