##
# Utilities
# @module util
# @namespace cormo

Promise = require 'bluebird'

##
# Returns leaf object and last part.
#
# e.g.) (obj, 'a.b.c') -> [ obj.a.b, 'c' ]
# @memberOf util
# @param {Object} obj
# @param {String|Array<String>} path
# @param {Boolean} [create_object=true]
# @return {Array} [ leaf_object, last_part_of_path ]
exports.getLeafOfPath = (obj, path, create_object) ->
  parts = if Array.isArray path then path[..] else path.split '.'
  last = parts.pop()
  if parts.length > 0
    if create_object isnt false
      for part in parts
        obj = obj[part] ||= {}
    else
      for part in parts
        obj = obj[part]
        return [] if not obj
  [obj, last]

##
# Gets a value of object by path
# @memberOf util
# @param {Object} obj
# @param {String|Array<String>} path
# @return {*}
exports.getPropertyOfPath = (obj, path) ->
  [obj, last] = exports.getLeafOfPath obj, path, false
  return obj?[last]

##
# Sets a value to object by path
# @memberOf util
# @param {Object} obj
# @param {String|Array<String>} path
# @param {*} value
exports.setPropertyOfPath = (obj, path, value) ->
  [obj, last] = exports.getLeafOfPath obj, path
  obj[last] = value
  return

##
# Sures a function call in the original domain
# @memberOf util
# @param {Function} fn
# @return {Function}
exports.bindDomain = (fn) ->
  if fn and d = process.domain
    d.bind fn
  else
    fn
