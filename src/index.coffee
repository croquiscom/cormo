###
# CORMO module
# @module cormo
###

###
# Exports [[#Connection]] class
# @memberOf cormo
###
exports.Connection = exports.DBConnection = require './connection'

types = require './types'
for type of types
  exports[type] = types[type]
