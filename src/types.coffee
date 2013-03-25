##
# CORMO types
# @module types
# @namespace cormo

##
# Represents a string, used in model schemas.
# @memberOf types
exports.String = 'string'

##
# Represents a double-precision floating-point, used in model schemas.
# @memberOf types
exports.Number = 'number'

##
# Represents a boolean, used in model schemas.
# @memberOf types
exports.Boolean = 'boolean'

##
# Represents a 32bit integer, used in model schemas.
# @memberOf types
exports.Integer = 'integer'

##
# Represents a two-dimensional point, used in model schemas.
# This type is supported only in MongoDB and MySQL.
# @memberOf types
exports.GeoPoint = 'geopoint'

##
# Represents a date, used in model schemas.
# @memberOf types
exports.Date = 'date'

##
# Represents a general object, used in model schemas.
# A value of this type will be converted to a JSON string
# if the adapter does not support a general object.
# @memberOf types
exports.Object = 'object'

##
# Represents a record id, used in model schemas.
# @memberOf types
exports.RecordID = 'recordid'

##
# Converts JavaScript built-in class to CORMO type
# @private
# @param {Function|String} type
# @return {String}
exports._toCORMOType = (type) ->
  switch type
    when String then type = exports.String
    when Number then type = exports.Number
    when Boolean then type = exports.Boolean
    when Date then type = exports.Date
    when Object then type = exports.Object
  if typeof type isnt 'string'
    throw new Error 'unknown type : ' + type
  type.toLowerCase()

##
# A pseudo class represents a record's unique identifier.
#
# Its real type differs by adapters.
#
# * String for MongoDB
# * Integer for MySQL, SQLite3, PostegreSQL
# @namespace types
class RecordID

##
# A pseudo class represents an integer
# @namespace types
class Integer

##
# A pseudo class represents a two-dimensional point
# @namespace types
class GeoPoint
