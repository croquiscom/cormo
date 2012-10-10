SQLite3Adapter_createAdapter = require './sqlite3'

module.exports = (connection) ->
  adapter = SQLite3Adapter_createAdapter connection
  _super_connect = adapter.connect
  adapter.connect = (settings, callback) ->
    _super_connect.call @, database: ':memory:', callback
  return adapter
