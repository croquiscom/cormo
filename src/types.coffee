###
# Represents a string, used in model schemas.
# @memberOf cormo
###
exports.String = 'string'

###
# Represents a double-precision floating-point, used in model schemas.
# @memberOf cormo
###
exports.Number = 'number'

###
# Represents a 32bit integer, used in model schemas.
# @memberOf cormo
###
exports.Integer = 'integer'

###
# Represents a two-dimensional point, used in model schemas.
# This type is supported only in MongoDB and MySQL.
# @memberOf cormo
###
exports.GeoPoint = 'geopoint'

###
# Represents a date, used in model schemas.
# @memberOf cormo
###
exports.Date = 'date'

###
# A pseudo class represents a record's unique identifier.
#
# Its real type differs by adapters.
#
# * String for MongoDB
# * Integer for MySQL, SQLite3, PostegreSQL
# @namespace types
###
class RecordID

###
# A pseudo class represents an integer
# @namespace types
###
class Integer
