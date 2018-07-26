_ = require 'lodash'
inflector = require '../util/inflector'
Promise = require 'bluebird'
util = require '../util'

##
# Model persistence
# @namespace model
ModelPersistenceMixin = (Base) -> class extends Base
  ##
  # Creates a record and saves it to the database
  # 'Model.create(data, callback)' is the same as 'Model.build(data).save(callback)'
  # @param {Object} [data={}]
  # @param {Object} [options]
  # @param {Boolean} [options.skip_log=false]
  # @return {Model} created record
  # @promise
  # @nodejscallback
  @create: (data, options, callback) ->
    if typeof data is 'function'
      callback = data
      data = {}
      options = {}
    else if typeof options is 'function'
      callback = options
      options = {}
    @_checkReady().then =>
      @build(data).save options
    .nodeify util.bindDomain callback

  ##
  # Creates multiple records and saves them to the database.
  # @param {Array<Object>} data
  # @return {Array<Model>} created records
  # @promise
  # @nodejscallback
  @createBulk: (data, callback) ->
    @_checkReady().then =>
      return Promise.reject new Error 'data is not an array' if not Array.isArray data

      return Promise.resolve [] if data.length is 0

      records = data.map (item) => @build item
      promises = records.map (record) ->
        record.validate()
      Promise.all promises
      .then =>
        records.forEach (record) -> record._runCallbacks 'save', 'before'
        records.forEach (record) -> record._runCallbacks 'create', 'before'
        @_createBulk records
        .finally ->
          records.forEach (record) -> record._runCallbacks 'create', 'after'
          records.forEach (record) -> record._runCallbacks 'save', 'after'
    .nodeify util.bindDomain callback

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

  _create: (options) ->
    data = @_buildSaveData()

    ctor = @constructor
    ctor._connection.log ctor._name, 'create', data if not options?.skip_log
    id = await ctor._adapter.create ctor._name, data
    Object.defineProperty @, 'id', configurable: false, enumerable: true, writable: false, value: id
    # save sub objects of each association
    foreign_key = inflector.foreign_key ctor._name
    promises = Object.keys(ctor._associations).map (column) =>
      sub_promises = (@['__cache_' + column] or []).map (sub) ->
        sub[foreign_key] = id
        sub.save()
      Promise.all sub_promises
    try
      await Promise.all promises
    catch
    @_prev_attributes = {}

  @_createBulk: (records) ->
    error = undefined
    data_array = records.map (record) ->
      try
        data = record._buildSaveData()
      catch e
        error = e
      return data
    return Promise.reject error if error

    @_connection.log @_name, 'createBulk', data_array
    @_adapter.createBulkAsync @_name, data_array
    .then (ids) ->
      records.forEach (record, i) ->
        Object.defineProperty record, 'id', configurable: false, enumerable: true, writable: false, value: ids[i]
      Promise.resolve records

  _update: (options) ->
    ctor = @constructor
    if ctor.dirty_tracking
      # update changed values only
      if not @isDirty()
        return Promise.resolve()

      data = {}
      adapter = ctor._adapter
      schema = ctor._schema
      try
        for path of @_prev_attributes
          ctor._buildSaveDataColumn data, @_attributes, path, schema[path], true
      catch e
        return Promise.reject e

      ctor._connection.log ctor._name, 'update', data if not options?.skip_log
      adapter.updatePartialAsync ctor._name, data, id: @id, {}
      .then =>
        @_prev_attributes = {}
    else
      # update all
      try
        data = @_buildSaveData()
      catch e
        return Promise.reject e

      ctor._connection.log ctor._name, 'update', data if not options?.skip_log
      ctor._adapter.updateAsync ctor._name, data
      .then =>
        @_prev_attributes = {}

  ##
  # Saves data to the database
  # @param {Object} [options]
  # @param {Boolean} [options.validate=true]
  # @param {Boolean} [options.skip_log=false]
  # @return {Model} this
  # @promise
  # @nodejscallback
  save: (options, callback) ->
    if typeof options is 'function'
      callback = options
      options = {}
    @constructor._checkReady().then =>
      if options?.validate isnt false
        return @validate()
        .then =>
          @save _.extend({}, options, validate: false)

      @_runCallbacks 'save', 'before'

      if @id
        @_runCallbacks 'update', 'before'
        @_update options
        .finally =>
          @_runCallbacks 'update', 'after'
          @_runCallbacks 'save', 'after'
      else
        @_runCallbacks 'create', 'before'
        try
          await @_create options
        finally
          @_runCallbacks 'create', 'after'
          @_runCallbacks 'save', 'after'
    .then =>
      Promise.resolve @
    .nodeify util.bindDomain callback

module.exports = ModelPersistenceMixin
