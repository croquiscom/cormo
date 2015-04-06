##
# CORMO types
# @module types
# @namespace cormo

##
# Represents a string, used in model schemas.
# @memberOf types
exports.String = class CormoTypesString

##
# Represents a double-precision floating-point, used in model schemas.
# @memberOf types
exports.Number = class CormoTypesNumber

##
# Represents a boolean, used in model schemas.
# @memberOf types
exports.Boolean = class CormoTypesBoolean

##
# Represents a 32bit integer, used in model schemas.
# @memberOf types
exports.Integer = class CormoTypesInteger

##
# Represents a two-dimensional point, used in model schemas.
#
# This type is supported only in MongoDB and MySQL.
# @memberOf types
exports.GeoPoint = class CormoTypesGeoPoint

##
# Represents a date, used in model schemas.
# @memberOf types
exports.Date = class CormoTypesDate

##
# Represents a general object, used in model schemas.
#
# A value of this type will be converted to a JSON string
# if the adapter does not support a general object.
# @memberOf types
exports.Object = class CormoTypesObject

##
# Represents a record id, used in model schemas.
# @memberOf types
exports.RecordID = class CormoTypesRecordID

##
# Converts JavaScript built-in class to CORMO type
# @private
# @param {Function|String} type
# @return {String}
exports._toCORMOType = (type) ->
  if typeof type is 'string'
    type = type.toLowerCase()
  switch type
    when String,'string' then type = exports.String
    when Number,'number' then type = exports.Number
    when Boolean,'boolean' then type = exports.Boolean
    when 'integer' then type = exports.Integer
    when 'geopoint' then type = exports.GeoPoint
    when Date,'date' then type = exports.Date
    when Object,'object' then type = exports.Object
    when 'recordid' then type = exports.RecordID
  if typeof type is 'function'
    type = new type()
  type

##
# A pseudo class represents a record's unique identifier.
#
# Its real type differs by adapters.
#
# * String for MongoDB
# * Integer for MySQL, SQLite3, PostegreSQL
# @namespace ptypes
class RecordID

##
# A pseudo class represents an integer
# @namespace ptypes
class Integer

##
# A pseudo class represents a two-dimensional point
# @namespace ptypes
class GeoPoint
