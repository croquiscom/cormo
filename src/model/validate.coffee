types = require '../types'
util = require '../util'

##
# Model validate
# @namespace model
class ModelValidate
  @_validateColumn: (data, column, property) ->
    [obj, last] = util.getLeafOfPath data, property._parts, false
    value = obj?[last]
    if value?
      switch property.type
        when types.Number
          value = Number value
          if isNaN value
            return "'#{column}' is not a number"
          else
            obj[last] = value
        when types.Boolean
          if typeof value isnt 'boolean'
            return "'#{column}' is not a boolean"
        when types.Integer
          value = Number value
          # value>>0 checkes integer and 32bit
          if isNaN(value) or (value>>0) isnt value
            return "'#{column}' is not an integer"
          else
            obj[last] = value
        when types.GeoPoint
          if not ( Array.isArray(value) and value.length is 2 )
            return "'#{column}' is not a geo point"
          else
            value[0] = Number value[0]
            value[1] = Number value[1]
        when types.Date
          value = new Date value
          if isNaN value.getTime()
            return "'#{column}' is not a date"
          else
            obj[last] = value
    else
      if property.required
        return "'#{column}' is required"

    return

  ##
  # Validates data
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @return {Boolean}
  validate: (callback) ->
    @_runCallbacks 'validate', 'before'

    errors = []

    ctor = @constructor
    schema = ctor._schema
    for column, property of schema
      if error = ctor._validateColumn @, column, property
        errors.push error

    @constructor._validators.forEach (validator) =>
      try
        r = validator @
        if r is false
          errors.push 'validation failed'
        else if typeof r is 'string'
          errors.push r
      catch e
        errors.push e.message
    if errors.length > 0
      @_runCallbacks 'validate', 'after'
      callback? new Error errors.join ','
      return false
    else
      @_runCallbacks 'validate', 'after'
      callback? null
      return true

  ##
  # Adds a validator
  #
  # A validator must return false(boolean) or error message(string), or throw an Error exception if invalid
  # @param {Function} validator
  # @param {Model} validator.record
  @addValidator: (validator) ->
    @_validators.push validator

module.exports = ModelValidate
