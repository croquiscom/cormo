##
# Base class for adapters
class AdapterBase
  ##
  # Wraps adapter specific errors
  # @param {String} msg CORMO's error message
  # @param {Error} cause adapter specific error object
  @wrapError: (msg, cause) ->
    error = new Error msg
    error.cause = cause
    return error

module.exports = AdapterBase
