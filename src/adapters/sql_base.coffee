AdapterBase = require './base'
types = require '../types'

##
# Base class for SQL adapters
# @namespace adapter
class SQLAdapterBase extends AdapterBase
  _param_place_holder: (pos) -> '?'
  _contains_op: 'LIKE'

  _buildWhere: (schema, conditions, params, conjunction='AND') ->
    if Array.isArray conditions
      subs = conditions.map (condition) => @_buildWhere schema, condition, params
    else if typeof conditions is 'object'
      keys = Object.keys conditions
      if keys.length is 0
        return ''
      if keys.length is 1
        key = keys[0]
        if key.substr(0, 1) is '$'
          switch key
            when '$and'
              return @_buildWhere schema, conditions[key], params, 'AND'
            when '$or'
              return @_buildWhere schema, conditions[key], params, 'OR'
        else
          value = conditions[key]
          op = '='
          if Array.isArray value
            values = value.map (value) =>
              params.push value
              return @_param_place_holder params.length
            return "#{key.replace '.', '_'} IN (#{values.join ','})"
          else if typeof value is 'object' and (keys = Object.keys value).length is 1
            sub_key = keys[0]
            if sub_key is '$in'
              values = value[sub_key]
              values = values.map (value) =>
                params.push value
                return @_param_place_holder params.length
              return "#{key.replace '.', '_'} IN (#{values.join ','})"
            switch sub_key
              when '$gt'
                op = '>'
                value = value[sub_key]
              when '$lt'
                op = '<'
                value = value[sub_key]
              when '$gte'
                op = '>='
                value = value[sub_key]
              when '$lte'
                op = '<='
                value = value[sub_key]
              when '$contains'
                op = ' ' + @_contains_op + ' '
                value = '%' + value[sub_key] + '%'
          if schema[key]?.type is types.Date
            params.push new Date value
          else
            params.push value
          return key.replace('.', '_') + op + @_param_place_holder params.length
      else
        subs = keys.map (key) =>
          obj = {}
          obj[key] = conditions[key]
          @_buildWhere schema, obj, params
    else
      return ''
    return '(' + subs.join(' ' + conjunction + ' ') + ')'

module.exports = SQLAdapterBase
