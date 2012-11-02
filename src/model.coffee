inflector = require './inflector'
async = require 'async'
DBQuery = require './query'

###
# Base class for models
###
class DBModel
  ###
  # Returns a new model class extending DBModel
  # @param {DBConnection} connection
  # @param {String} name
  # @param {Object} schema
  # @return {Class}
  ###
  @newModel: (connection, name, schema) ->
    class NewModel extends DBModel
    Object.defineProperty NewModel, '_connection', value: connection
    Object.defineProperty NewModel, '_adapter', value: connection._adapter
    Object.defineProperty NewModel, '_name', value: name
    Object.defineProperty NewModel, '_schema', value: schema
    Object.defineProperty NewModel, '_associations', value: {}
    Object.defineProperty NewModel, '_validators', value: []

    NewModel._normalizeSchema()

    return NewModel

  ###
  # Normalizes a schema
  # (column: String -> column: {type: String})
  ###
  @_normalizeSchema: ->
    adapter = @_adapter
    schema = @_schema
    for column, property of schema
      # convert simple type to object
      if typeof property is 'function' or typeof property is 'string'
        schema[column] = type: property

      # convert javascript built-in class
      type = schema[column].type
      switch type
        when String then type = DBModel.String
        when Number then type = DBModel.Number
        when Date then type = DBModel.Date
      if typeof type isnt 'string'
        throw new Error 'unknown type : ' + type
      schema[column].type = type.toLowerCase()

      # check supports of GeoPoint
      if type is DBModel.GeoPoint and not adapter.support_geopoint
        throw new Error 'this adapter does not support GeoPoint'
    return

  @_waitingForConnection: (object, method, args) ->
    return true if @_connection._waitingForApplyingSchemas object, method, args
    return @_connection._waitingForConnection object, method, args

  ###
  # Creates a record
  # @param {Object} [data={}]
  ###
  constructor: (data) ->
    data = data or {}
    schema = @constructor._schema
    Object.keys(schema).forEach (column) =>
      if data[column]?
        @[column] = data[column]

    Object.defineProperty @, 'id', configurable: true, enumerable: true, writable: false, value: undefined

  ###
  # Creates a record.
  # 'Model.build(data)' is the same as 'new Model(data)'
  # @param {Object} [data={}]
  # @return {DBModel}
  ###
  @build: (data) ->
    return new @ data

  ###
  # Creates a record and saves it to the database
  # 'Model.create(data, callback)' is the same as 'Model.build(data).save(callback)'
  # @param {Object} [data={}]
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {DBModel} callback.record created record
  ###
  @create: (data, callback) ->
    if typeof data is 'function'
      callback = data
      data = {}
    @build(data).save callback

  ###
  # Validates data
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @return {Boolean}
  ###
  validate: (callback) ->
    errors = []

    schema = @constructor._schema
    Object.keys(schema).forEach (column) =>
      property = schema[column]
      if @[column]?
        switch property.type
          when DBModel.Number
            value = Number @[column]
            if isNaN value
              errors.push "'#{column}' is not a number"
            else
              @[column] = value
          when DBModel.Integer
            value = Number @[column]
            # value>>0 checkes integer and 32bit
            if isNaN(value) or (value>>0) isnt value
              errors.push "'#{column}' is not an integer"
            else
              @[column] = value
          when DBModel.GeoPoint
            value = @[column]
            if not ( Array.isArray(value) and value.length is 2 )
              errors.push "'#{column}' is not a geo point"
            else
              value[0] = Number value[0]
              value[1] = Number value[1]
          when DBModel.Date
            value = @[column]
            value = new Date value
            if isNaN value.getTime()
              errors.push "'#{column}' is not a date"
            else
              @[column] = value
      else
        if property.required
          errors.push "'#{column}' is required"

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
      callback? new Error errors.join ','
      return false
    else
      callback? null
      return true

  _buildSaveData: ->
    data = {}
    schema = @constructor._schema
    Object.keys(schema).forEach (column) =>
      if @[column]?
        data[column] = @[column]
      else
        data[column] = null
    return data

  _create: (callback) ->
    return if @constructor._waitingForConnection @, @_create, arguments

    ctor = @constructor
    data = @_buildSaveData()
    if Object.keys(data).length is 0
      return callback new Error 'empty data', @

    ctor._adapter.create ctor._name, data, (error, id) =>
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
          callback null, @

  _update: (callback) ->
    return if @constructor._waitingForConnection @, @_update, arguments

    ctor = @constructor
    data = @_buildSaveData()
    data.id = @id

    ctor._adapter.update ctor._name, data, (error) =>
      return callback error, @ if error
      callback null, @

  ###
  # Saves data to the database
  # @param {Object} [options]
  # @param {Boolean} [options.validate=true]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {DBModel} callback.record this
  ###
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

    if @id
      @_update callback
    else
      @_create callback

  ###
  # Destroys this record (remove from the database)
  # @param {Function} callback
  # @param {Error} callback.error
  ###
  destroy: (callback) ->
    callback = (->) if typeof callback isnt 'function'
    @constructor.delete { id: @id }, callback
    return

  ###
  # Finds a record by id
  # @param {RecordID} id
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {DBModel} callback.record
  # @return {DBQuery}
  # @throws Error('not found')
  ###
  @find: (id, callback) ->
    return if @_waitingForConnection @, @find, arguments

    query = new DBQuery @
    query.find id
    if typeof callback is 'function'
      query.exec (error, records) ->
        error = new Error('not found') if records?.length is 0
        error = new Error('unknown error') if records?.length > 1
        return callback error if error
        callback null, records[0]
    return query

  ###
  # Finds records by conditions
  # @param {Object} [condition]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Array<DBModel>} callback.records
  # @return {DBQuery}
  ###
  @where: (condition, callback) ->
    return if @_waitingForConnection @, @where, arguments

    if typeof condition is 'function'
      callback = condition
      condition = null
    query = new DBQuery @
    query.where condition
    if typeof callback is 'function'
      query.exec callback
    return query

  ###
  # Selects columns for result
  # @param {Object} [columns]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Array<DBModel>} callback.records
  # @return {DBQuery}
  ###
  @select: (columns, callback) ->
    return if @_waitingForConnection @, @select, arguments

    if typeof columns is 'function'
      callback = columns
      columns = null
    query = new DBQuery @
    query.select columns
    if typeof callback is 'function'
      query.exec callback
    return query

  ###
  # Counts records by conditions
  # @param {Object} [condition]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Number} callback.count
  # @return {DBQuery}
  ###
  @count: (condition, callback) ->
    return if @_waitingForConnection @, @count, arguments

    if typeof condition is 'function'
      callback = condition
      condition = null
    query = new DBQuery @
    query.where condition
    if typeof callback is 'function'
      query.count callback
    return query

  ###
  # Deletes records by conditions
  # @param {Object} [condition]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Number} callback.count
  # @return {DBQuery}
  ###
  @delete: (condition, callback) ->
    return if @_waitingForConnection @, @delete, arguments

    if typeof condition is 'function'
      callback = condition
      condition = null
    query = new DBQuery @
    query.where condition
    if typeof callback is 'function'
      query.delete callback
    return query

  ###
  # Adds a has-many association
  # @param {Class} target_model
  # @param {Object} [options]
  # @param {String} [options.as]
  # @param {String} [options.foreign_key]
  ###
  @hasMany: (target_model, options) ->
    if options?.foreign_key
      foreign_key = options.foreign_key
    else if options?.as
      foreign_key = options.as + '_id'
    else
      foreign_key = inflector.foreign_key @_name
    target_model._addForeignKey foreign_key, @_connection._adapter.key_type

    column = options?.as or inflector.tableize(target_model._name)
    columnCache = '__cache_' + column
    columnGetter = '__getter_' + column

    @_associations[column] = { type: 'hasMany' }

    Object.defineProperty @prototype, column,
      get: ->
        # getter must be created per instance due to __scope
        if not @.hasOwnProperty columnGetter
          getter = (reload, callback) ->
            if typeof reload is 'function'
              callback = reload
              reload = false
            # @ is getter.__scope in normal case (this_model_instance.target_model_name()),
            # but use getter.__scope for safety
            self = getter.__scope
            if (not self[columnCache] or reload) and self.id
              conditions = {}
              conditions[foreign_key] = self.id
              target_model.where conditions, (error, records) ->
                return callback error if error
                self[columnCache] = records
                callback null, records
            else
              callback null, self[columnCache] or []
          getter.build = (data) ->
            # @ is getter, so use getter.__scope instead
            self = getter.__scope
            new_object = new target_model data
            new_object[foreign_key] = self.id
            self[columnCache] = [] if not self[columnCache]
            self[columnCache].push new_object
            return new_object
          getter.__scope = @
          Object.defineProperty @, columnCache, value: null, writable: true
          Object.defineProperty @, columnGetter, value: getter
        return @[columnGetter]

  ###
  # Adds a belongs-to association
  # @param {Class} target_model
  # @param {Object} [options]
  # @param {String} [options.as]
  # @param {String} [options.foreign_key]
  ###
  @belongsTo: (target_model, options) ->
    if options?.foreign_key
      foreign_key = options.foreign_key
    else if options?.as
      foreign_key = options.as + '_id'
    else
      foreign_key = inflector.foreign_key target_model._name
    @_addForeignKey foreign_key, target_model._adapter.key_type

    column = options?.as or inflector.underscore(target_model._name)
    columnCache = '__cache_' + column
    columnGetter = '__getter_' + column

    Object.defineProperty @prototype, column,
      get: ->
        # getter must be created per instance due to __scope
        if not @.hasOwnProperty columnGetter
          getter = (reload, callback) ->
            if typeof reload is 'function'
              callback = reload
              reload = false
            # @ is getter.__scope in normal case (this_model_instance.target_model_name()),
            # but use getter.__scope for safety
            self = getter.__scope
            if (not self[columnCache] or reload) and self[foreign_key]
              target_model.find self[foreign_key], (error, record) ->
                return callback error if error
                self[columnCache] = record
                callback null, record
            else
              callback null, self[columnCache]
          getter.__scope = @
          Object.defineProperty @, columnCache, value: null, writable: true
          Object.defineProperty @, columnGetter, value: getter
        return @[columnGetter]
  
  ###
  # Adds a validator
  #
  # A validator must return false(boolean) or error message(string), or throw an Error exception if invalid
  # @param {Function} validator
  # @param {DBModel} validator.record
  ###
  @addValidator: (validator) ->
    @_validators.push validator

  ###
  # Drops this model from the database
  # @param {Function} callback
  # @param {Error} callback.error
  ###
  @drop: (callback) ->
    return if @_waitingForConnection @, @drop, arguments

    @_adapter.drop @_name, callback

  ###
  # Deletes all records from the database
  # @param {Function} callback
  # @param {Error} callback.error
  ###
  @deleteAll: (callback) ->
    callback = (->) if typeof callback isnt 'function'
    @delete callback
    return

  @_addForeignKey: (column, type) ->
    return if @_schema.hasOwnProperty column

    @_schema[column] = { type: type }

for type, value of require './types'
  DBModel[type] = value
  DBModel::[type] = value

module.exports = DBModel
