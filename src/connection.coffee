EventEmitter = require('events').EventEmitter

###
# Manages connection to a database
# @param {String} adapater_name
# @param {Object} settings
###
class DBConnection extends EventEmitter
  constructor: (adapter_name, settings) ->
    @connected = false
    initialize = require __dirname + '/adapters/' + adapter_name
    initialize @, settings, (error, adapter) =>
      if error
        @emit 'error', error
        return
      @_adapter = adapter
      @connected = true
      @emit 'connected'

module.exports = DBConnection
