###
# Base class for adapters
###
class AdapterBase
  @wrapError: (msg, cause) ->
    error = new Error msg
    error.cause = cause
    return error

module.exports = AdapterBase
