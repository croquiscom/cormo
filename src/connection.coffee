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

    createAdapter = require __dirname + '/adapters/' + adapter_name
    createAdapter @, settings, (error, adapter) =>
      if error
        @emit 'error', error
        return
      @_adapter = adapter
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

  ###
  # Applies schemas
  # @param {Function} callback
  # @param {Error} callback.error
  ###
  applySchemas: (callback) ->
    return if @_waitingForConnection @, @applySchemas, arguments

    if @_adapter.applySchemas?
      @_adapter.applySchemas callback
    else
      callback null

for type, value of require './types'
  DBConnection[type] = value

module.exports = DBConnection
