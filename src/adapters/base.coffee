##
# Base class for adapters
# @namespace adapter
class AdapterBase
  ##
  # Wraps adapter specific errors
  # @param {String} msg CORMO's error message
  # @param {Error} cause adapter specific error object
  @wrapError: (msg, cause) ->
    error = new Error msg
    error.cause = cause
    return error

  idToDB: (value) ->
    value

  valueToDB: (value, column, property) ->
    if value? then value else null

  _getModelID: (data) ->
    data.id

  valueToModel: (value, column, property) ->
    value

  _convertToModelInstance: (model, data) ->
    modelClass = @_connection.models[model]
    new modelClass data, @_getModelID data

module.exports = AdapterBase
