AdapterBase = require './base'
types = require '../types'

##
# Base class for SQL adapters
# @namespace adapter
class SQLAdapterBase extends AdapterBase
  _param_place_holder: (pos) -> '?'
  _contains_op: 'LIKE'
  _false_value: 'FALSE'
  _escape_ch: '"'

  _convertValueType: (value, property_type_class) ->
    if property_type_class is types.Date
      value = new Date value
    else if property_type_class is types.Number
      value = Number value
      if isNaN value
        value = Number.MAX_VALUE
    else if property_type_class is types.Integer
      value = Number value
      if isNaN(value) or (value>>0) isnt value
        value = -2147483648
    value

  _buildWhereSingle: (property, key, value, params) ->
    if key is 'id'
      property_type_class = @key_type
    else
      if not property?
        throw new Error("unknown column '#{key}'")
      property_type_class = property.type_class
    if property and not property_type_class
      # group field
      column = @_buildGroupExpr property
    else
      column = @_escape_ch + key.replace('.', '_') + @_escape_ch
    op = '='
    if Array.isArray value
      if value.length is 0
        return @_false_value
      values = value.map (value) =>
        params.push value
        return @_param_place_holder params.length
      return "#{column} IN (#{values.join ','})"
    else if typeof value is 'object' and value isnt null and (keys = Object.keys value).length is 1
      sub_key = keys[0]
      switch sub_key
        when '$not'
          if value[sub_key] is null
            return "NOT #{column} IS NULL"
          else
            return "(NOT (#{@_buildWhereSingle property, key, value[sub_key], params}) OR #{column} IS NULL)"
        when '$in'
          values = value[sub_key]
          if values.length is 0
            return @_false_value
          values = values.map (value) =>
            params.push value
            return @_param_place_holder params.length
          return "#{column} IN (#{values.join ','})"
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
          values = value[sub_key]
          if not Array.isArray values
            values = [values]
          if values.length is 0
            return @_false_value
          values = values.map (value) =>
            params.push '%' + value + '%'
            return column + op + @_param_place_holder params.length
          return "(#{values.join ' OR '})"
        else
          throw new Error "unknown operator '#{sub_key}'"
    else if value is null
      return "#{column} IS NULL"

    params.push @_convertValueType value, property_type_class
    return column + op + @_param_place_holder params.length

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
          return @_buildWhereSingle schema[key], key, conditions[key], params
      else
        subs = keys.map (key) => @_buildWhereSingle schema[key], key, conditions[key], params
    else
      throw new Error "'#{JSON.stringify conditions}' is not an object"

    if subs.length is 0
      return ''
    else if subs.length is 1
      return subs[0]
    else
      return '(' + subs.join(' ' + conjunction + ' ') + ')'

  _buildGroupExpr: (group_expr) ->
    op = Object.keys(group_expr)[0]
    if op is '$sum'
      sub_expr = group_expr[op]
      if sub_expr is 1
        return "COUNT(*)"
      else if sub_expr.substr(0, 1) is '$'
        return "SUM(#{sub_expr.substr 1})"
      else
        throw new Error "unknown expression '#{JSON.stringify op}'"
    else if op is '$min'
      sub_expr = group_expr[op]
      if sub_expr.substr(0, 1) is '$'
        return "MIN(#{sub_expr.substr 1})"
      else
        throw new Error "unknown expression '#{JSON.stringify op}'"
    else if op is '$max'
      sub_expr = group_expr[op]
      if sub_expr.substr(0, 1) is '$'
        return "MAX(#{sub_expr.substr 1})"
      else
        throw new Error "unknown expression '#{JSON.stringify op}'"
    else
      throw new Error "unknown expression '#{JSON.stringify op}'"

  _buildGroupFields: (group_by, group_fields) ->
    selects = []
    if group_by
      [].push.apply selects, group_by
    for field, expr of group_fields
      selects.push "#{@_buildGroupExpr expr} as #{field}"
    return selects.join ','

  _buildSelect: (model_class, select) ->
    if select
      if select.length>0
        schema = model_class._schema
        escape_ch = @_escape_ch
        select = select.map (column) -> "#{escape_ch}#{schema[column]._dbname}#{escape_ch}"
        return 'id,' + select.join ','
      else
        return 'id'
    else
      return '*'

module.exports = SQLAdapterBase
