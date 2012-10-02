EventEmitter = require('events').EventEmitter

DBModel = require './model'

###
# Normalizes a schema
# (field: String -> field: {type: String})
###
_normalizeSchema = (schema) ->
  for field, property of schema
    if typeof property is 'function'
      schema[field] = type: property
  return

###
# Manages connection to a database
# @param {String} adapater_name
# @param {Object} settings
###
class DBConnection extends EventEmitter
  constructor: (adapter_name, settings) ->
    @connected = false
    @models = {}

    initialize = require __dirname + '/adapters/' + adapter_name
    initialize @, settings, (error, adapter) =>
      if error
        @emit 'error', error
        return
      @_adapter = adapter
      @connected = true
      @emit 'connected'

  ###
  # Creates a Model class
  # @param {String} name
  # @param {Object} schema
  # @return {Object}
  ###
  model: (name, schema) ->
    _normalizeSchema schema

    class NewModel extends DBModel
    Object.defineProperty NewModel, '_connection', value: @
    Object.defineProperty NewModel, '_name', value: name
    Object.defineProperty NewModel, '_schema', value: schema
    @models[name] = NewModel
    return NewModel

  ###
  # Applies schemas.
  # (This makes sense only for SQL adapters)
  ###
  applySchemas: (callback) ->
    if @_adapter.applySchemas?
      @_adapter.applySchemas callback
    else
      callback null

module.exports = DBConnection
