inflector = require './inflector'
async = require 'async'
DBQuery = require './query'

###
# Base class for models
###
class DBModel
  @String: String
  @Number: Number
  @ForeignKey: ->
  
  ###
  # Creates a record
  # @param {Object} [data={}]
  ###
  constructor: (data) ->
    data = data or {}
    schema = @constructor._schema
    Object.keys(schema).forEach (field) =>
      if data[field]
        @[field] = data[field]

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
  # Saves data to the database
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {DBModel} callback.record this
  ###
  save: (callback) ->
    callback = (->) if typeof callback isnt 'function'
    if @id
      ctor = @constructor
      ctor._connection._adapter.update ctor._name, @, (error) =>
        return callback error, @ if error
        callback null, @
    else
      if Object.keys(@).length is 0
        return callback new Error 'empty data', @
      ctor = @constructor
      ctor._connection._adapter.create ctor._name, @, (error, id) =>
        return callback error, @ if error
        @id = id
        # save sub objects of each association
        foreign_key = inflector.foreign_key ctor._name
        async.forEach Object.keys(ctor._associations), (field, callback) =>
            async.forEach @['__cache_' + field] or [], (sub, callback) ->
                sub[foreign_key] = id
                sub.save (error) ->
                  callback error
              , (error) ->
                callback error
          , (error) =>
            callback null, @

  ###
  # Finds a record by id
  # @param {String} id
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {DBModel} callback.record
  # @return {DBQuery}
  # @throws Error('not found')
  ###
  @find: (id, callback) ->
    query = new DBQuery @
    query.find id
    if typeof callback is 'function'
      query.exec (error, records) ->
        return callback error if error
        return callback new Error('unknown error') if records.length isnt 1
        callback null, records[0]
    return query

  ###
  # Find records by conditions
  # @param {Object} conditions
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Array<DBModel>} callback.records
  # @return {DBQuery}
  ###
  @where: (conditions, callback) ->
    query = new DBQuery @
    query.where conditions
    if typeof callback is 'function'
      query.exec callback
    return query

  ###
  # Adds a has-many association
  # @param {Class} target_model
  ###
  @hasMany: (target_model) ->
    foreign_key = inflector.foreign_key @_name
    target_model._addForeignKey foreign_key

    field = inflector.tableize(target_model._name)
    fieldCache = '__cache_' + field
    fieldGetter = '__getter_' + field

    @_associations[field] = { type: 'hasMany' }

    Object.defineProperty @prototype, field,
      get: ->
        # getter must be created per instance due to __scope
        if not @.hasOwnProperty fieldGetter
          getter = (reload, callback) ->
            if typeof reload is 'function'
              callback = reload
              reload = false
            # @ is getter.__scope in normal case (this_model_instance.target_model_name()),
            # but use getter.__scope for safety
            self = getter.__scope
            if (not self[fieldCache] or reload) and @id
              conditions = {}
              conditions[foreign_key] = @id
              target_model._connection._adapter.find target_model._name, conditions, (error, records) ->
                return callback error if error
                self[fieldCache] = records
                callback null, records
            else
              callback null, self[fieldCache] or []
          getter.build = (data) ->
            # @ is getter, so use getter.__scope instead
            self = getter.__scope
            new_object = new target_model data
            new_object[foreign_key] = self.id
            self[fieldCache] = [] if not self[fieldCache]
            self[fieldCache].push new_object
            return new_object
          getter.__scope = @
          Object.defineProperty @, fieldCache, value: null, writable: true
          Object.defineProperty @, fieldGetter, value: getter
        return @[fieldGetter]

  ###
  # Adds a belongs-to association
  # @param {Class} target_model
  ###
  @belongsTo: (target_model) ->
    @_addForeignKey inflector.foreign_key target_model._name

  ###
  # Drops this model from the database
  # @param {Function} callback
  # @param {Error} callback.error
  ###
  @drop: (callback) ->
    @_connection._adapter.drop @_name, callback

  ###
  # Deletes all records from the database
  # @param {Function} callback
  # @param {Error} callback.error
  ###
  @deleteAll: (callback) ->
    @_connection._adapter.deleteAll @_name, callback

  @_addForeignKey: (field) ->
    return if @_schema.hasOwnProperty field

    @_schema[field] = { type: @ForeignKey }

module.exports = DBModel
