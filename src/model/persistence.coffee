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
  # 'Model.create(data)' is the same as 'Model.build(data).save()'
  # @param {Object} [data={}]
  # @param {Object} [options]
  # @param {Boolean} [options.skip_log=false]
  # @return {Model} created record
  # @promise
  @create: (data, options) ->
    await @_checkReady()
    await @build(data).save options

  ##
  # Creates multiple records and saves them to the database.
  # @param {Array<Object>} data
  # @return {Array<Model>} created records
  # @promise
  @createBulk: (data) ->
    await @_checkReady()

    if not Array.isArray data
      throw new Error 'data is not an array'

    if data.length is 0
      return []

    records = data.map (item) => @build item
    promises = records.map (record) ->
      record.validate()
    await Promise.all promises
    records.forEach (record) -> record._runCallbacks 'save', 'before'
    records.forEach (record) -> record._runCallbacks 'create', 'before'
    try
      await @_createBulk records
    finally
      records.forEach (record) -> record._runCallbacks 'create', 'after'
      records.forEach (record) -> record._runCallbacks 'save', 'after'

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
    return

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
    if error
      throw error

    @_connection.log @_name, 'createBulk', data_array
    ids = await @_adapter.createBulk @_name, data_array
    records.forEach (record, i) ->
      Object.defineProperty record, 'id', configurable: false, enumerable: true, writable: false, value: ids[i]
    records

  _update: (options) ->
    ctor = @constructor
    if ctor.dirty_tracking
      # update changed values only
      if not @isDirty()
        return

      data = {}
      adapter = ctor._adapter
      schema = ctor._schema
      for path of @_prev_attributes
        ctor._buildSaveDataColumn data, @_attributes, path, schema[path], true

      ctor._connection.log ctor._name, 'update', data if not options?.skip_log
      await adapter.updatePartial ctor._name, data, id: @id, {}
      @_prev_attributes = {}
    else
      # update all
      data = @_buildSaveData()

      ctor._connection.log ctor._name, 'update', data if not options?.skip_log
      await ctor._adapter.update ctor._name, data
      @_prev_attributes = {}

  ##
  # Saves data to the database
  # @param {Object} [options]
  # @param {Boolean} [options.validate=true]
  # @param {Boolean} [options.skip_log=false]
  # @return {Model} this
  # @promise
  save: (options) ->
    await @constructor._checkReady()
    if options?.validate isnt false
      await @validate()
      return await @save _.extend({}, options, validate: false)

    @_runCallbacks 'save', 'before'

    if @id
      @_runCallbacks 'update', 'before'
      try
        await @_update options
      finally
        @_runCallbacks 'update', 'after'
        @_runCallbacks 'save', 'after'
    else
      @_runCallbacks 'create', 'before'
      try
        await @_create options
      finally
        @_runCallbacks 'create', 'after'
        @_runCallbacks 'save', 'after'
    return @

module.exports = ModelPersistenceMixin
