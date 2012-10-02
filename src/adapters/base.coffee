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

_pluralize = (str) ->
  if _uncountable_words.indexOf(str.toLowerCase()) is -1
    for rule in _plural_rules
      if not (rule[0] instanceof RegExp)
        rule[0] = new RegExp rule[0], 'i'
      if rule[0].test str
        return str.replace rule[0], rule[1]
  return str

class AdapterBase
  @wrapError: (msg, cause) ->
    error = new Error msg
    error.cause = cause
    return error

  @toCollectionName: (name) ->
    return _pluralize name.toLowerCase()

module.exports = AdapterBase
