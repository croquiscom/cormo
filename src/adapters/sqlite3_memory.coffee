SQLite3Adapter_createAdapter = require './sqlite3'

###
# Creates a SQLite3 adapter in memory
# @param {Connection} connection
# @param {Object} settings
# @param {Function} callback
# @param {Error} callback.error
# @param {SQLite3Adapter} callback.adapter
###
createAdapter = (connection, settings, callback) ->
  SQLite3Adapter_createAdapter connection, database: ':memory:', callback

module.exports = createAdapter
