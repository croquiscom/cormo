##
# Model callbacks
# @namespace model
ModelCallbackMixin = (Base) -> class extends Base
  ##
  # Adds a callback of after initializing
  # @param {Function|String} method
  @afterInitialize: (method) ->
    @addCallback 'after', 'initialize', method

  ##
  # Adds a callback of after finding
  # @param {Function|String} method
  @afterFind: (method) ->
    @addCallback 'after', 'find', method

  ##
  # Adds a callback of before saving
  # @param {Function|String} method
  @beforeSave: (method) ->
    @addCallback 'before', 'save', method

  ##
  # Adds a callback of after saving
  # @param {Function|String} method
  @afterSave: (method) ->
    @addCallback 'after', 'save', method

  ##
  # Adds a callback of before creating
  # @param {Function|String} method
  @beforeCreate: (method) ->
    @addCallback 'before', 'create', method

  ##
  # Adds a callback of after creating
  # @param {Function|String} method
  @afterCreate: (method) ->
    @addCallback 'after', 'create', method

  ##
  # Adds a callback of before updating
  # @param {Function|String} method
  @beforeUpdate: (method) ->
    @addCallback 'before', 'update', method

  ##
  # Adds a callback of after updating
  # @param {Function|String} method
  @afterUpdate: (method) ->
    @addCallback 'after', 'update', method

  ##
  # Adds a callback of before destroying
  # @param {Function|String} method
  @beforeDestroy: (method) ->
    @addCallback 'before', 'destroy', method

  ##
  # Adds a callback of after destroying
  # @param {Function|String} method
  @afterDestroy: (method) ->
    @addCallback 'after', 'destroy', method

  ##
  # Adds a callback of before validating
  # @param {Function|String} method
  @beforeValidate: (method) ->
    @addCallback 'before', 'validate', method

  ##
  # Adds a callback of after validating
  # @param {Function|String} method
  @afterValidate: (method) ->
    @addCallback 'after', 'validate', method

  ##
  # Adds a callback
  # @param {String} type
  # @param {String} name
  # @param {Function|String} method
  @addCallback: (type, name, method) ->
    @_checkConnection()
    return if not (type is 'before' or type is 'after') or not name
    callbacks_map = @_callbacks_map ||= {}
    callbacks = callbacks_map[name] ||= []
    callbacks.push type: type, method: method

  _runCallbacks: (name, type) ->
    callbacks = @constructor._callbacks_map?[name]
    callbacks = callbacks?.filter (callback) -> callback.type is type
    callbacks?.forEach (callback) =>
      method = callback.method
      if typeof method is 'string'
        throw new Error("The method '#{method}' doesn't exist") unless @[method]
        method = @[method]
      throw new Error("Cannot execute method") if typeof method isnt 'function'
      method.call @

module.exports = ModelCallbackMixin
