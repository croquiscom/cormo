types = require '../types'
util = require '../util'

##
# Model validate
# @namespace model
ModelValidateMixin = (Base) -> class extends Base
  @_validateType: (column, type_class, value) ->
    switch type_class
      when types.Number
        value = Number value
        if isNaN value
          throw "'#{column}' is not a number"
      when types.Boolean
        if typeof value isnt 'boolean'
          throw "'#{column}' is not a boolean"
      when types.Integer
        value = Number value
        # value>>0 checkes integer and 32bit
        if isNaN(value) or (value>>0) isnt value
          throw "'#{column}' is not an integer"
      when types.GeoPoint
        if not ( Array.isArray(value) and value.length is 2 )
          throw "'#{column}' is not a geo point"
        else
          value[0] = Number value[0]
          value[1] = Number value[1]
      when types.Date
        value = new Date value
        if isNaN value.getTime()
          throw "'#{column}' is not a date"
    value

  @_validateColumn: (data, column, property, for_update) ->
    [obj, last] = util.getLeafOfPath data, property._parts, false
    value = obj?[last]
    if value?
      if property.array
        throw "'#{column}' is not an array" if not Array.isArray value
        try
          for v, i in value
            value[i] = @_validateType column, property.type_class, v
        catch error
          # TODO: detail message like 'array of types'
          throw "'#{column}' is not an array"
      else
        if value.$inc?
          if for_update
            if property.type_class in [types.Number, types.Integer]
              obj[last] = $inc: @_validateType column, property.type_class, value.$inc
            else
              throw "'#{column}' is not a number type"
          else
            throw '$inc is allowed only for update method'
        else
          obj[last] = @_validateType column, property.type_class, value
    else
      if property.required
        throw "'#{column}' is required"

    return

  ##
  # Validates data
  # @promise
  validate: ->
    @_runCallbacks 'validate', 'before'

    errors = []

    ctor = @constructor
    schema = ctor._schema
    for column, property of schema
      try
        ctor._validateColumn @, column, property
      catch error
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
      throw new Error errors.join ','
    else
      @_runCallbacks 'validate', 'after'
      return

  ##
  # Adds a validator
  #
  # A validator must return false(boolean) or error message(string), or throw an Error exception if invalid
  # @param {Function} validator
  # @param {Model} validator.record
  @addValidator: (validator) ->
    @_checkConnection()
    @_validators.push validator
    return

module.exports = ModelValidateMixin
