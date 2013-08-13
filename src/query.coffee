_ = require 'underscore'
async = require 'async'
console_future = require './console_future'

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
    @_includes = []
    @_options =
      orders: []
      conditions_of_group: []
 
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

  _addCondition: (condition) ->
    if @_options.group_fields
      keys = Object.keys condition
      if keys.length is 1 and @_options.group_fields.hasOwnProperty keys[0]
        @_options.conditions_of_group.push condition
        return
    @_conditions.push condition

  ##
  # Finds records by condition
  # @param {Object} condition
  # @return {Query} this
  where: (condition) ->
    if Array.isArray condition
      condition.forEach (cond) =>
        @_addCondition cond
    else if condition?
      @_addCondition condition
    return @

  ##
  # Selects columns for result
  # @param {String} columns
  # @return {Query} this
  select: (columns) ->
    @_options.select = null
    if typeof columns is 'string'
      schema_columns = Object.keys @_model._schema
      intermediate_paths = @_model._intermediate_paths
      select = []
      columns.split(/\s+/).forEach (column) ->
        if schema_columns.indexOf(column) >= 0
          select.push column
        else if intermediate_paths[column]
          # select all nested columns
          column += '.'
          schema_columns.forEach (sc) ->
            select.push sc if sc.indexOf(column) is 0
      @_options.select = select
    return @

  ##
  # Specifies orders of result
  # @param {String} orders
  # @return {Query} this
  order: (orders) ->
    if typeof orders is 'string'
      avaliable_columns = []
      [].push.apply avaliable_columns, Object.keys @_model._schema
      [].push.apply avaliable_columns, Object.keys @_options.group_fields if @_options.group_fields
      orders.split(/\s+/).forEach (order) =>
        asc = true
        if order[0] is '-'
          asc = false
          order = order[1..]
        if avaliable_columns.indexOf(order) >= 0
          @_options.orders.push if asc then order else '-'+order
    return @

  ##
  # Groups result records
  # @param {String} group_by
  # @param {Object} fields
  # @return {Query} this
  group: (group_by, fields) ->
    @_options.group_by = null
    schema_columns = Object.keys @_model._schema
    if typeof group_by is 'string'
      columns = group_by.split(/\s+/).filter (column) -> schema_columns.indexOf(column) >= 0
      @_options.group_by = columns
    @_options.group_fields = fields
    return @

  ##
  # Sets limit of query
  # @param {Number} limit
  # @return {Query} this
  limit: (limit) ->
    @_options.limit = limit
    return @

  ##
  # Sets skip of query
  # @param {Number} skip
  # @return {Query} this
  skip: (skip) ->
    @_options.skip = skip
    return @

  ##
  # Returns raw instances instead of model instances
  # @see Query::exec
  return_raw_instance: ->
    @_options.return_raw_instance = true
    return @

  ##
  # Cache result.
  #
  # If cache of key exists, actual query does not performed.
  # If cache does not exist, query result will be saved in cache.
  #
  # Redis is used to cache.
  # @param {Object} options
  # @param {String} options.key
  # @param {Number} options.ttl TTL in seconds
  # @param {Boolean} options.refresh don't load from cache if true
  cache: (options) ->
    @_options.cache = options
    return @

  ##
  # Returns associated objects also
  # @param {String} column
  # @param {String} [select]
  include: (column, select) ->
    @_includes.push column: column, select: select
    return @

  _exec: (options, callback) ->
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

  _execAndInclude: (options, callback) ->
    @_exec options, (error, records) =>
      return callback error if error
      async.forEach @_includes, (include, callback) =>
        @_connection.fetchAssociated records, include.column, include.select, callback
      , (error) ->
        callback error, records

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

    console_future.execute callback, (callback) =>
      if (cache_options = @_options.cache) and (cache_key = cache_options.key)
        # try cache
        @_model._loadFromCache cache_key, cache_options.refresh, (error, records) =>
          return callback null, records if not error
          # no cache, execute query
          @_execAndInclude options, (error, records) =>
            return callback error if error
            # save result to cache
            @_model._saveToCache cache_key, cache_options.ttl, records, (error) ->
              callback error, records
      else
        @_execAndInclude options, callback

  ##
  # Executes the query as a count operation
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Number} callback.count
  # @return {Query} this
  # @see AdapterBase::count
  count: (callback) ->
    return if @_model._waitingForReady @, @count, arguments

    console_future.execute callback, (callback) =>
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
      else if not object[column] and model._intermediate_paths[column]
        # set all nested columns null
        column += '.'
        temp = {}
        Object.keys(schema).forEach (sc) ->
          temp[sc.substr(column.length)] = null if sc.indexOf(column) is 0
        @_validateAndBuildSaveData errors, data, updates, path + column, temp
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

    console_future.execute callback, (callback) =>
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

  _doIntegrityActions: (integrities, ids, callback) ->
    async.forEach integrities, (integrity, callback) =>
      if integrity.type is 'parent_nullify'
        data = {}
        data[integrity.column] = null
        conditions = {}
        conditions[integrity.column] = ids
        integrity.child.update data, conditions, (error, count) ->
          callback error
      else if integrity.type is 'parent_restrict'
        conditions = {}
        conditions[integrity.column] = ids
        integrity.child.count conditions, (error, count) ->
          return callback error if error
          return callback new Error 'rejected' if count>0
          callback null
      else if integrity.type is 'parent_delete'
        conditions = {}
        conditions[integrity.column] = ids
        integrity.child.delete conditions, (error, count) ->
          return callback error if error
          callback null
      else
        callback null
    , callback

  _doArchiveAndIntegrity: (options, callback) ->
    need_archive = @_model.archive
    integrities = @_model._integrities.filter (integrity) -> integrity.type.substr(0, 7) is 'parent_'
    need_child_archive = integrities.some (integrity) => integrity.child.archive
    need_integrity = need_child_archive or (integrities.length > 0 and not @_adapter.native_integrity)
    return callback null if not need_archive and not need_integrity

    async.waterfall [
      # find all records to be deleted
      (callback) =>
        query = @_model.where @_conditions
        # we need only id field for integrity
        query.select '' if not need_archive
        query.exec skip_log: options?.skip_log, callback
      (records, callback) =>
        return callback null, records if not need_archive
        archive_records = records.map (record) => model: @_name, data: record
        @_connection.models['_Archive'].createBulk archive_records, (error) =>
          return callback error if error
          callback null, records
      (records, callback) =>
        return callback null if not need_integrity
        return callback null if records.length is 0
        ids = records.map (record) -> record.id
        @_doIntegrityActions integrities, ids, callback
    ], callback

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

    console_future.execute callback, (callback) =>
      if @_id
        @_conditions.push id: @_id
        delete @_id
      @_connection.log @_name, 'delete', conditions: @_conditions if not options?.skip_log

      @_doArchiveAndIntegrity options, (error) =>
        return callback error if error
        @_adapter.delete @_name, @_conditions, _bindDomain callback

module.exports = Query
