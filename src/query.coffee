_ = require 'underscore'

_bindDomain = (fn) -> if d = process.domain then d.bind fn else fn

##
# Collects conditions to query
class Query
  ##
  # Creates a query instance
  # @param {Class<Model>} model
  constructor: (model) ->
    @_model = model
    @_name = model._name
    @_connection = model._connection
    @_adapter = model._connection._adapter
    @_conditions = []
    @_options =
      orders: []
 
  ##
  # Finds a record by id
  # @param {RecordID|Array<RecordID>} id
  # @return {Query} this
  find: (id) ->
    if Array.isArray id
      @_id = _.uniq id
      @_find_single_id = false
    else
      @_id = id
      @_find_single_id = true
    return @
 
  ##
  # Finds records by ids while preserving order.
  # @param {Array<RecordID>} ids
  # @return {Query} this
  findPreserve: (ids) ->
    @_id = _.uniq ids
    @_find_single_id = false
    @_preserve_order_ids = ids
    return @

  ##
  # Finds records near target
  # @param {Object} target
  # @return {Query} this
  near: (target) ->
    @_options.near = target
    return @

  ##
  # Finds records by condition
  # @param {Object} condition
  # @return {Query} this
  where: (condition) ->
    if Array.isArray condition
      @_conditions.push.apply @_conditions, condition
    else if condition?
      @_conditions.push condition
    return @

  ##
  # Selects columns for result
  # @param {String} columns
  # @return {Query} this
  select: (columns) ->
    @_options.select = null
    schema_columns = Object.keys @_model._schema
    if typeof columns is 'string'
      columns = columns.split(/\s+/).filter (column) -> schema_columns.indexOf(column) >= 0
      @_options.select = columns
    return @

  ##
  # Specifies orders of result
  # @param {String} orders
  # @return {Query} this
  order: (orders) ->
    schema_columns = Object.keys @_model._schema
    if typeof orders is 'string'
      orders.split(/\s+/).forEach (order) =>
        asc = true
        if order[0] is '-'
          asc = false
          order = order[1..]
        if schema_columns.indexOf(order) >= 0
          @_options.orders.push if asc then order else '-'+order
    return @

  ##
  # Sets limit of query
  # @param {Number} limit
  # @return {Query} this
  limit: (limit) ->
    @_options.limit = limit
    return @

  ##
  # Executes the query
  # @param {Object} [options]
  # @param {Boolean} [options.skip_log=false]
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Model|Array<Model>} callback.records
  # @return {Query} this
  # @see AdapterBase::findById
  # @see AdapterBase::find
  exec: (options, callback) ->
    return if @_model._waitingForReady @, @exec, arguments

    if typeof options is 'function'
      callback = options
      options = {}

    if @_find_single_id and @_conditions.length is 0
      @_connection.log @_name, 'find by id', id: @_id, options: @_options if not options?.skip_log
      @_adapter.findById @_name, @_id, @_options, _bindDomain (error, record) ->
        return callback new Error('not found') if error or not record
        callback null, record
      return
    expected_count = undefined
    if @_id
      if Array.isArray @_id
        return callback null, [] if @_id.length is 0
        @_conditions.push id: { $in: @_id }
        expected_count = @_id.length
      else
        @_conditions.push id: @_id
        expected_count = 1
    @_connection.log @_name, 'find', conditions: @_conditions, options: @_options if not options?.skip_log
    @_adapter.find @_name, @_conditions, @_options, _bindDomain (error, records) =>
      return callback error if error
      if expected_count?
        return callback new Error('not found') if records.length isnt expected_count
      if @_preserve_order_ids
        callback null, @_preserve_order_ids.map (id) ->
          for record in records
            return record if record.id is id
      else
        callback null, records

  ##
  # Executes the query as a count operation
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Number} callback.count
  # @return {Query} this
  # @see AdapterBase::count
  count: (callback) ->
    return if @_model._waitingForReady @, @count, arguments

    if @_id
      @_conditions.push id: @_id
      delete @_id
    @_connection.log @_name, 'count', conditions: @_conditions
    @_adapter.count @_name, @_conditions, _bindDomain callback

  _validateAndBuildSaveData: (errors, data, updates, path, object) ->
    model = @_model
    schema = model._schema
    for column of object
      property = schema[path+column]
      if property
        try
          model._validateColumn updates, path+column, property
        catch error
          errors.push error
        model._buildSaveDataColumn data, updates, path+column, property, true
      else if typeof object[column] is 'object'
        @_validateAndBuildSaveData errors, data, updates, path + column + '.', object[column]

  ##
  # Executes the query as a update operation
  # @param {Object} updates
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Number} callback.count
  # @return {Query} this
  # @see AdapterBase::count
  update: (updates, callback) ->
    return if @_model._waitingForReady @, @update, arguments

    errors = []
    data = {}
    @_validateAndBuildSaveData errors, data, updates, '', updates
    if errors.length > 0
      return callback new Error errors.join ','

    if @_id
      @_conditions.push id: @_id
      delete @_id
    @_connection.log @_name, 'update', data: data, conditions: @_conditions, options: @_options
    @_adapter.updatePartial @_name, data, @_conditions, @_options, _bindDomain callback

  ##
  # Executes the query as a delete operation
  # @param {Object} [options]
  # @param {Boolean} [options.skip_log=false]
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Number} callback.count
  # @return {Query} this
  # @see AdapterBase::delete
  delete: (options, callback) ->
    return if @_model._waitingForReady @, @delete, arguments

    if typeof options is 'function'
      callback = options
      options = {}

    if @_id
      @_conditions.push id: @_id
      delete @_id
    @_connection.log @_name, 'delete', conditions: @_conditions if not options?.skip_log
    if @_model.archive
      @_model.where @_conditions, (error, records) =>
        return callback error if error
        records = records.map (record) => model: @_name, data: record
        @_connection.models['_Archive'].createBulk records, (error, records) =>
          return callback error if error
          @_adapter.delete @_name, @_conditions, _bindDomain callback
    else
      @_adapter.delete @_name, @_conditions, _bindDomain callback

module.exports = Query
