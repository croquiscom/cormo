EventEmitter = require('events').EventEmitter
DBModel = require './model'

###
# Manages connection to a database
###
class DBConnection extends EventEmitter
  ###
  # Creates a connection
  # @param {String} adapater_name
  # @param {Object} settings
  # @see MySQLAdapter.createAdapter
  # @see MongoDBAdapter.createAdapter
  ###
  constructor: (adapter_name, settings) ->
    @connected = false
    @models = {}

    @_adapter = require(__dirname + '/adapters/' + adapter_name) @
    @_adapter.connect settings, (error) =>
      if error
        @_adapter = null
        @emit 'error', error
        return
      @connected = true
      @emit 'connected'

  ###
  # Creates a model class
  # @param {String} name
  # @param {Object} schema
  # @return {Class}
  ###
  model: (name, schema) ->
    return @models[name] = DBModel.newModel @, name, schema

  _waitingForConnection: (object, method, args) ->
    return false if @connected
    @once 'connected', ->
      method.apply object, args
    return true

  _waitingForApplyingSchemas: (object, method, args) ->
    return false if not @_applying_schemas
    @once 'schemas_applied', ->
      method.apply object, args
    return true

  ###
  # Applies schemas
  # @param {Function} [callback]
  # @param {Error} callback.error
  ###
  applySchemas: (callback) ->
    if @_adapter.applySchemas?
      @_applying_schemas = true
      return if @_waitingForConnection @, @applySchemas, arguments
      @_adapter.applySchemas (error) =>
        @_applying_schemas = false
        @emit 'schemas_applied'
        callback? error
    else
      callback? null

for type, value of require './types'
  DBConnection[type] = value
  DBConnection::[type] = value

module.exports = DBConnection
