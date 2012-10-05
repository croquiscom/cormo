inflector = require './inflector'

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
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {DBModel} callback.record this
  ###
  save: (callback) ->
    if @id
      # TODO update
    else
      if Object.keys(@).length is 0
        return callback new Error 'empty data', @
      ctor = @constructor
      ctor._connection._adapter.create ctor._name, @, (error, id) =>
        if not error
          @id = id
        callback error, @

  ###
  # Finds a record by id
  # @param {String} id
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {DBModel} callback.record
  ###
  @find: (id, callback) ->
    @_connection._adapter.findById @_name, id, callback

  ###
  # Adds a has-many association
  # @param {Class} target_model
  ###
  @hasMany: (target_model) ->
    foreign_key = inflector.foreign_key @_name
    target_model._addForeignKey foreign_key

    field = inflector.tableize(target_model._name)
    fieldCache = '__' + field
    fieldGetter = '__getter_' + field

    Object.defineProperty @prototype, field,
      get: ->
        if not @.hasOwnProperty fieldGetter
          @[fieldGetter] = getter = (callback) ->
            # @ is getter.__scope in normal case (this_model_instance.target_model_name()),
            # but use getter.__scope for safety
            self = getter.__scope
            if not self.hasOwnProperty fieldCache
              self[fieldCache] = []
            callback null, self[fieldCache]
          getter.build = (data) ->
            # @ is getter, so use getter.__scope instead
            self = getter.__scope
            new_object = new target_model data
            new_object[foreign_key] = self.id
            self[fieldCache].push new_object
            return new_object
          getter.__scope = @
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
