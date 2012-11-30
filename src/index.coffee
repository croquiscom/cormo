##
# CORMO module
# @module cormo

##
# Exports [[#Connection]] class
# @memberOf cormo
exports.Connection = require './connection'

##
# Exports [[#Model]] class
# @memberOf cormo
exports.Model = require './model'

types = require './types'
for type of types
  exports[type] = types[type]
