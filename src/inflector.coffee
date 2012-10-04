_plural_rules = [
  [ 'person$', 'people' ]
  [ 'man$', 'men' ]
  [ 's$', 's' ]
  [ '$', 's' ]
]

_uncountable_words = [
  'fish'
  'money'
  'rice'
  'sheep'
]

exports.foreign_key = (name) ->
  return exports.underscore(name) + '_id'

exports.pluralize = (str) ->
  if _uncountable_words.indexOf(str.toLowerCase()) is -1
    for rule in _plural_rules
      if not (rule[0] instanceof RegExp)
        rule[0] = new RegExp rule[0], 'i'
      if rule[0].test str
        return str.replace rule[0], rule[1]
  return str

exports.tableize = (name) ->
  return exports.pluralize exports.underscore name

exports.underscore = (str) ->
  str = str.replace /([A-Z0-9]+)([A-Z][a-z])/g, "$1_$2"
  str = str.replace /([a-z0-9])([A-Z])/g, "$1_$2"
  str = str.replace '-', '_'
  str = str.toLowerCase()
  return str
