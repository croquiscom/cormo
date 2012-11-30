inflector = require './inflector'
async = require 'async'
_ = require 'underscore'
types = require './types'

_bindDomain = (fn) -> if d = process.domain then d.bind fn else fn
 
_getRef = (obj, parts) ->
  return [obj, parts[0]] if parts.length is 1

  parts = parts[..]
  last = parts.pop()
  for part in parts
    obj = obj[part] ||= {}
  [obj, last]

_getValue = (obj, parts) ->
  return obj[parts[0]] if parts.length is 1

  for part in parts
    obj = obj[part]
    break if not obj
  return obj

_setValue = (obj, parts, value) ->
  [obj, last] = _getRef obj, parts
  obj[last] = value
  return

##
# Base class for models
# @uses ModelQuery
# @uses ModelCallback
# @uses ModelTimestamp
class Model
  @dirty_tracking: false

  ##
  # Returns a new model class extending Model
  # @param {Connection} connection
  # @param {String} name
  # @param {Object} schema
  # @return {Class<Model>}
  @newModel: (connection, name, schema) ->
    class NewModel extends Model
    NewModel.connection connection, name
    for name, property of schema
      NewModel.column name, property
    return NewModel

  ##
  # Sets a connection of this model
  # @param {Connection} connection
  # @param {String} [name]
  @connection: (connection, name) ->
    name = @name if not name
    connection.models[name] = @

    Object.defineProperty @, '_connection', value: connection
    Object.defineProperty @, '_adapter', value: connection._adapter
    Object.defineProperty @, '_associations', value: {}
    Object.defineProperty @, '_validators', value: []
    Object.defineProperty @, '_name', configurable: true, value: name
    Object.defineProperty @, '_schema', configurable: true, value: {}

  ##
  # Adds a column to this model
  # @param {String} name
  # @param {String|Object} property
  @column: (name, property) ->
    # nested type
    if typeof property is 'object' and (not property.type or property.type.type)
      for subtype, subproperty of property
        @column name+'.'+subtype, subproperty
      return

    return if @_schema.hasOwnProperty name

    # convert simple type to object
    if typeof property is 'function' or typeof property is 'string'
      property = type: property

    # convert javascript built-in class
    type = property.type
    switch type
      when String then type = types.String
      when Number then type = types.Number
      when Boolean then type = types.Boolean
      when Date then type = types.Date
      when Object then type = types.Object
    if typeof type isnt 'string'
      throw new Error 'unknown type : ' + type
    type = type.toLowerCase()

    # check supports of GeoPoint
    if type is types.GeoPoint and not @_adapter.support_geopoint
      throw new Error 'this adapter does not support GeoPoint'

    if type is types.RecordID
      target_connection = property.connection or @_connection
      if @_connection is target_connection and target_connection._adapter.key_type_internal
        type = target_connection._adapter.key_type_internal
      else
        type = target_connection._adapter.key_type

    property.type = type
    property.parts = name.split '.'
    property.dbname = name.replace '.', '_' if not @_adapter.support_nested

    @_schema[name] = property

  @_waitingForConnection: (object, method, args) ->
    return true if @_connection._waitingForApplyingSchemas object, method, args
    return @_connection._waitingForConnection object, method, args

  ##
  # Creates a record
  # @param {Object} [data={}]
  constructor: (data) ->
    data = data or {}
    ctor = @constructor
    schema = ctor._schema
    adapter = ctor._adapter

    Object.defineProperty @, '_prev_attributes', writable: true, value: {}
    if ctor.dirty_tracking
      Object.defineProperty @, '_attributes', value: {}
      Object.defineProperty @, '_objects', value: {}
      for column, property of schema
        obj = @
        parts = property.parts
        if parts.length > 1
          parts = parts[..]
          parts.pop()
          path = parts.join '.'
          for part in parts
            do (path) =>
              if not obj.hasOwnProperty part
                @_objects[path] = {}
                @_defineIntermediateProperty obj, part, path, false
            obj = obj[part]
      for column, property of schema
        [obj, last] = _getRef @, property.parts
        @_defineProperty obj, last, column, false
    else
      Object.defineProperty @, 'isDirty', value: -> true
      Object.defineProperty @, 'getChanged', value: -> []
      Object.defineProperty @, 'get', value: ->
      Object.defineProperty @, 'getPrevious', value: ->
      Object.defineProperty @, 'set', value: ->
      Object.defineProperty @, 'reset', value: ->

    if id = arguments[1]
      # if id exists, this is called from adapter with database record data
      for column, property of schema
        parts = property.parts
        if adapter.support_nested
          value = _getValue data, parts
        else
          value = data[property.dbname]
        if value?
          value = adapter.valueToModel value, column, property
          _setValue @, parts, value

      Object.defineProperty @, 'id', configurable: false, enumerable: true, writable: false, value: id

      @_runCallbacks 'find', 'after'
    else
      for column, property of schema
        parts = property.parts
        value = _getValue data, parts
        if value?
          _setValue @, parts, value

      Object.defineProperty @, 'id', configurable: true, enumerable: true, writable: false, value: undefined

    @_runCallbacks 'initialize', 'after'

  _defineIntermediateProperty: (object, key, path, enumerable) ->
    Object.defineProperty object, key,
      configurable: true
      enumerable: enumerable
      get: => @_objects[path]
      set: (value) =>
        obj = @_objects[path]
        for k of obj
          obj[k] = undefined
        for k, v of value
          obj[k] = v

  _defineProperty: (object, key, path, enumerable) ->
    Object.defineProperty object, key,
      configurable: true
      enumerable: enumerable
      get: => @get path
      set: (value) => @set path, value

  isDirty: ->
    Object.keys(@_prev_attributes).length > 0

  getChanged: ->
    Object.keys @_prev_attributes

  get: (path) ->
    _getValue @_attributes, path.split '.'

  getPrevious: (path) ->
    @_prev_attributes[path]

  set: (path, value) ->
    parts = path.split '.'
    if not @_prev_attributes.hasOwnProperty path
      @_prev_attributes[path] = _getValue @_attributes, parts
    [obj, last] = _getRef @, parts
    @_defineProperty obj, last, path, value?
    _setValue @_attributes, parts, value
    while parts.length > 1
      parts.pop()
      [obj, last] = _getRef @, parts
      @_defineIntermediateProperty obj, last, parts.join('.'), true

  reset: ->
    for path, value of @_prev_attributes
      @set path, value
    @_prev_attributes = {}

  ##
  # Creates a record.
  # 'Model.build(data)' is the same as 'new Model(data)'
  # @param {Object} [data={}]
  # @return {Model}
  @build: (data) ->
    return new @ data

  ##
  # Creates a record and saves it to the database
  # 'Model.create(data, callback)' is the same as 'Model.build(data).save(callback)'
  # @param {Object} [data={}]
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Model} callback.record created record
  @create: (data, callback) ->
    if typeof data is 'function'
      callback = data
      data = {}
    @build(data).save callback

  ##
  # Creates multiple records and saves them to the database.
  # @param {Array<Object>} data
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Array<Model>} callback.records created records
  @createBulk: (data, callback) ->
    return callback new Error 'data is not an array' if not Array.isArray data

    records = data.map (item) => @build item
    async.forEach records, (record, callback) ->
      record.validate callback
    , (error) =>
      return callback error if error
      records.forEach (record) -> record._runCallbacks 'save', 'before'
      records.forEach (record) -> record._runCallbacks 'create', 'before'
      @_createBulk records, (error, records) ->
        records.forEach (record) -> record._runCallbacks 'create', 'after'
        records.forEach (record) -> record._runCallbacks 'save', 'after'
        callback error, records

  @_validateColumn: (data, column, property) ->
    [obj, last] = _getRef data, property.parts
    value = obj[last]
    if value?
      switch property.type
        when types.Number
          value = Number value
          if isNaN value
            return "'#{column}' is not a number"
          else
            obj[last] = value
        when types.Boolean
          if typeof value isnt 'boolean'
            return "'#{column}' is not a boolean"
        when types.Integer
          value = Number value
          # value>>0 checkes integer and 32bit
          if isNaN(value) or (value>>0) isnt value
            return "'#{column}' is not an integer"
          else
            obj[last] = value
        when types.GeoPoint
          if not ( Array.isArray(value) and value.length is 2 )
            return "'#{column}' is not a geo point"
          else
            value[0] = Number value[0]
            value[1] = Number value[1]
        when types.Date
          value = new Date value
          if isNaN value.getTime()
            return "'#{column}' is not a date"
          else
            obj[last] = value
    else
      if property.required
        return "'#{column}' is required"

    return

  ##
  # Validates data
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @return {Boolean}
  validate: (callback) ->
    @_runCallbacks 'validate', 'before'

    errors = []

    ctor = @constructor
    schema = ctor._schema
    for column, property of schema
      if error = ctor._validateColumn @, column, property
        errors.push error

    @constructor._validators.forEach (validator) =>
      try
        r = validator @
        if r is false
          errors.push 'validation failed'
        else if typeof r is 'string'
          errors.push r
      catch e
        errors.push e.message
    if errors.length > 0
      @_runCallbacks 'validate', 'after'
      callback? new Error errors.join ','
      return false
    else
      @_runCallbacks 'validate', 'after'
      callback? null
      return true

  @_buildSaveDataColumn: (data, model, column, property, allow_null) ->
    adapter = @_adapter
    parts = property.parts
    value = _getValue model, parts
    value = adapter.valueToDB value, column, property
    if allow_null or value isnt undefined
      if adapter.support_nested
        _setValue data, parts, value
      else
        data[property.dbname] = value

  _buildSaveData: ->
    data = {}
    ctor = @constructor
    schema = ctor._schema
    for column, property of schema
      ctor._buildSaveDataColumn data, @, column, property
    if @id?
      data.id = ctor._adapter.idToDB @id
    return data

  _create: (callback) ->
    return if @constructor._waitingForConnection @, @_create, arguments

    try
      data = @_buildSaveData()
    catch e
      return callback e, @

    ctor = @constructor
    ctor._connection.log ctor._name, 'create', data
    ctor._adapter.create ctor._name, data, _bindDomain (error, id) =>
      return callback error, @ if error
      Object.defineProperty @, 'id', configurable: false, enumerable: true, writable: false, value: id
      # save sub objects of each association
      foreign_key = inflector.foreign_key ctor._name
      async.forEach Object.keys(ctor._associations), (column, callback) =>
        async.forEach @['__cache_' + column] or [], (sub, callback) ->
          sub[foreign_key] = id
          sub.save (error) ->
            callback error
        , (error) ->
          callback error
      , (error) =>
        @_prev_attributes = {}
        callback null, @

  @_createBulk: (records, callback) ->
    return if @_waitingForConnection @, @_createBulk, arguments

    error = undefined
    data_array = records.map (record) ->
      try
        data = record._buildSaveData()
      catch e
        error = e
      return data
    return callback error, records if error

    @_connection.log @_name, 'createBulk', data_array
    @_adapter.createBulk @_name, data_array, _bindDomain (error, ids) ->
      return callback error, records if error
      records.forEach (record, i) ->
        Object.defineProperty record, 'id', configurable: false, enumerable: true, writable: false, value: ids[i]
      callback null, records

  _update: (callback) ->
    ctor = @constructor
    return if ctor._waitingForConnection @, @_update, arguments

    if ctor.dirty_tracking
      # update changed values only
      if not @isDirty()
        return callback null, @

      data = {}
      adapter = ctor._adapter
      schema = ctor._schema
      for path of @_prev_attributes
        parts = path.split '.'
        value = _getValue @_attributes, parts
        value = adapter.valueToDB value, path, schema[path]
        if adapter.support_nested
          _setValue data, parts, value
        else
          data[schema[path].dbname] = value

      ctor._connection.log ctor._name, 'update', data
      adapter.updatePartial ctor._name, data, id: @id, {}, _bindDomain (error) =>
        return callback error, @ if error
        @_prev_attributes = {}
        callback null, @
    else
      # update all
      try
        data = @_buildSaveData()
      catch e
        return callback e, @
      
      ctor._connection.log ctor._name, 'update', data
      ctor._adapter.update ctor._name, data, _bindDomain (error) =>
        return callback error, @ if error
        @_prev_attributes = {}
        callback null, @

  ##
  # Saves data to the database
  # @param {Object} [options]
  # @param {Boolean} [options.validate=true]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Model} callback.record this
  save: (options, callback) ->
    if typeof options is 'function'
      callback = options
      options = {}
    callback = (->) if typeof callback isnt 'function'

    if options?.validate isnt false
      @validate (error) =>
        return callback error if error
        @save validate: false, callback
      return

    @_runCallbacks 'save', 'before'

    if @id
      @_runCallbacks 'update', 'before'
      @_update (error, record) =>
        @_runCallbacks 'update', 'after'
        @_runCallbacks 'save', 'after'
        callback error, record
    else
      @_runCallbacks 'create', 'before'
      @_create (error, record) =>
        @_runCallbacks 'create', 'after'
        @_runCallbacks 'save', 'after'
        callback error, record

  ##
  # Destroys this record (remove from the database)
  # @param {Function} callback
  # @param {Error} callback.error
  destroy: (callback) ->
    callback = (->) if typeof callback isnt 'function'
    @_runCallbacks 'destroy', 'before'
    if @id
      @constructor.delete { id: @id }, (error, count) =>
        @_runCallbacks 'destroy', 'after'
        callback error
    else
      @_runCallbacks 'destroy', 'after'
      callback null
    return

  ##
  # Adds a has-many association
  # @param {Class<Model>|String} target_model_or_column
  # @param {Object} [options]
  # @param {String} [options.type]
  # @param {String} [options.as]
  # @param {String} [options.foreign_key]
  @hasMany: (target_model_or_column, options) ->
    @_connection._pending_associations.push
      type: 'hasMany'
      this_model: @
      target_model_or_column: target_model_or_column
      options: options

  ##
  # Adds a belongs-to association
  # @param {Class<Model>|String} target_model_or_column
  # @param {Object} [options]
  # @param {String} [options.type]
  # @param {String} [options.as]
  # @param {String} [options.foreign_key]
  @belongsTo: (target_model_or_column, options) ->
    @_connection._pending_associations.push
      type: 'belongsTo'
      this_model: @
      target_model_or_column: target_model_or_column
      options: options

  ##
  # Adds a validator
  #
  # A validator must return false(boolean) or error message(string), or throw an Error exception if invalid
  # @param {Function} validator
  # @param {Model} validator.record
  @addValidator: (validator) ->
    @_validators.push validator

  ##
  # Drops this model from the database
  # @param {Function} callback
  # @param {Error} callback.error
  # @see AdapterBase::drop
  @drop: (callback) ->
    return if @_waitingForConnection @, @drop, arguments

    @_adapter.drop @_name, _bindDomain callback

  ##
  # Deletes all records from the database
  # @param {Function} callback
  # @param {Error} callback.error
  @deleteAll: (callback) ->
    callback = (->) if typeof callback isnt 'function'
    @delete callback
    return

_use = (file) ->
  MixClass = require "./model/#{file}"
  _.extend Model, MixClass
  _.extend Model::, MixClass::
_use 'query'
_use 'callback'
_use 'timestamp'

module.exports = Model
