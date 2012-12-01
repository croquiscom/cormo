async = require 'async'
inflector = require '../inflector'
util = require '../util'

_bindDomain = (fn) -> if d = process.domain then d.bind fn else fn

##
# Model persistence
# @namespace model
class ModelPersistence
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

  @_buildSaveDataColumn: (data, model, column, property, allow_null) ->
    adapter = @_adapter
    parts = property._parts
    value = util.getPropertyOfPath model, parts
    value = adapter.valueToDB value, column, property
    if allow_null or value isnt undefined
      if adapter.support_nested
        util.setPropertyOfPath data, parts, value
      else
        data[property._dbname] = value

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
        ctor._buildSaveDataColumn data, @_attributes, path, schema[path], true

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

module.exports = ModelPersistence
