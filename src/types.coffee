##
# CORMO types
# @module types
# @namespace cormo

##
# Represents a string, used in model schemas.
# @memberOf types
exports.String = class CormoTypesString
  constructor: (length) ->
    if not(@ instanceof CormoTypesString)
      return new CormoTypesString length
    @length = length
  toString: -> if @length then "string(#{@length})" else 'string'

##
# Represents a double-precision floating-point, used in model schemas.
# @memberOf types
exports.Number = class CormoTypesNumber
  toString: -> 'number'

##
# Represents a boolean, used in model schemas.
# @memberOf types
exports.Boolean = class CormoTypesBoolean
  toString: -> 'boolean'

##
# Represents a 32bit integer, used in model schemas.
# @memberOf types
exports.Integer = class CormoTypesInteger
  toString: -> 'integer'

##
# Represents a two-dimensional point, used in model schemas.
#
# This type is supported only in MongoDB and MySQL.
# @memberOf types
exports.GeoPoint = class CormoTypesGeoPoint
  toString: -> 'geopoint'

##
# Represents a date, used in model schemas.
# @memberOf types
exports.Date = class CormoTypesDate
  toString: -> 'date'

##
# Represents a general object, used in model schemas.
#
# A value of this type will be converted to a JSON string
# if the adapter does not support a general object.
# @memberOf types
exports.Object = class CormoTypesObject
  toString: -> 'object'

##
# Represents a record id, used in model schemas.
# @memberOf types
exports.RecordID = class CormoTypesRecordID
  toString: -> 'recordid'

##
# Converts JavaScript built-in class to CORMO type
# @private
# @param {Function|String} type
# @return {String}
exports._toCORMOType = (type) ->
  if typeof type is 'string'
    type = type.toLowerCase()
    if /^string\((\d+)\)$/.test type
      type = new CormoTypesString(Number(RegExp.$1))
    else
      switch type
        when 'string' then type = exports.String
        when 'number' then type = exports.Number
        when 'boolean' then type = exports.Boolean
        when 'integer' then type = exports.Integer
        when 'geopoint' then type = exports.GeoPoint
        when 'date' then type = exports.Date
        when 'object' then type = exports.Object
        when 'recordid' then type = exports.RecordID
  else
    switch type
      when String then type = exports.String
      when Number then type = exports.Number
      when Boolean then type = exports.Boolean
      when Date then type = exports.Date
      when Object then type = exports.Object
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
