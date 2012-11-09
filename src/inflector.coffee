##
# Inflectors
# @module inflector

##
# Plural Rules
# @memberOf inflector
_plural_rules = [
  [ 'person$', 'people' ]
  [ 'man$', 'men' ]
  [ 's$', 's' ]
  [ '$', 's' ]
]

##
# Singular Rules
# @memberOf inflector
_singular_rules = [
  [ 'people$', 'person' ]
  [ 'men$', 'man' ]
  [ 's$', '' ]
]

##
# Uncountable words
# @memberOf inflector
_uncountable_words = [
  'fish'
  'money'
  'rice'
  'sheep'
]

##
# Returns foreign_key for a name
# @param {String} name
# @return {String}
# @memberOf inflector
exports.foreign_key = (name) ->
  return exports.underscore(name) + '_id'

##
# Returns pluralized string of a string
# @param {String} str
# @return {String}
# @memberOf inflector
exports.pluralize = (str) ->
  if _uncountable_words.indexOf(str.toLowerCase()) is -1
    for rule in _plural_rules
      if not (rule[0] instanceof RegExp)
        rule[0] = new RegExp rule[0], 'i'
      if rule[0].test str
        return str.replace rule[0], rule[1]
  return str

##
# Returns singularized string of a string
# @param {String} str
# @return {String}
# @memberOf inflector
exports.singularize = (str) ->
  if _uncountable_words.indexOf(str.toLowerCase()) is -1
    for rule in _singular_rules
      if not (rule[0] instanceof RegExp)
        rule[0] = new RegExp rule[0], 'i'
      if rule[0].test str
        return str.replace rule[0], rule[1]
  return str

##
# Returns table name of a name
# @param {String} name
# @return {String}
# @memberOf inflector
exports.tableize = (name) ->
  return exports.pluralize exports.underscore name

##
# Returns class name of a name
# @param {String} name
# @return {String}
# @memberOf inflector
exports.classify = (name) ->
  return exports.camelize exports.singularize name

##
# Returns underscored string of a string
# @param {String} str
# @return {String}
# @memberOf inflector
exports.underscore = (str) ->
  str = str.replace /([A-Z0-9]+)([A-Z][a-z])/g, "$1_$2"
  str = str.replace /([a-z0-9])([A-Z])/g, "$1_$2"
  str = str.replace '-', '_'
  str = str.toLowerCase()
  return str

##
# Returns camelized string of a string
# @param {String} str
# @return {String}
# @memberOf inflector
exports.camelize = (str) ->
  str = str.replace /_(.)/g, (_, $1) -> $1.toUpperCase()
  return str[0].toUpperCase() + str[1..]
