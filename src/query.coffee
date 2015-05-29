_ = require 'lodash'
{bindDomain} = require './util'
Promise = require 'bluebird'

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
    @_ifs = []
    @_current_if = true
    @_conditions = []
    @_includes = []
    @_options =
      orders: []
      conditions_of_group: []
      lean: model.lean_query
 
  ##
  # Finds a record by id
  # @param {RecordID|Array<RecordID>} id
  # @chainable
  find: (id) ->
    if not @_current_if
      return @
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
  # @chainable
  findPreserve: (ids) ->
    if not @_current_if
      return @
    @_id = _.uniq ids
    @_find_single_id = false
    @_preserve_order_ids = ids
    return @

  ##
  # Finds records near target
  # @param {Object} target
  # @chainable
  near: (target) ->
    if not @_current_if
      return @
    @_options.near = target
    return @

  ##
  # @private
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
  # @chainable
  where: (condition) ->
    if not @_current_if
      return @
    if Array.isArray condition
      condition.forEach (cond) =>
        @_addCondition cond
    else if condition?
      @_addCondition condition
    return @

  ##
  # Selects columns for result
  # @param {String} columns
  # @chainable
  select: (columns) ->
    if not @_current_if
      return @
    @_options.select = null
    @_options.select_raw = null
    if typeof columns is 'string'
      schema_columns = Object.keys @_model._schema
      intermediate_paths = @_model._intermediate_paths
      select = []
      select_raw = []
      columns.split(/\s+/).forEach (column) ->
        if schema_columns.indexOf(column) >= 0
          select.push column
          select_raw.push column
        else if intermediate_paths[column]
          # select all nested columns
          select_raw.push column
          column += '.'
          schema_columns.forEach (sc) ->
            select.push sc if sc.indexOf(column) is 0
      @_options.select = select
      @_options.select_raw = select_raw
    return @

  ##
  # Specifies orders of result
  # @param {String} orders
  # @chainable
  order: (orders) ->
    if not @_current_if
      return @
    if typeof orders is 'string'
      avaliable_columns = ['id']
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
  # @chainable
  group: (group_by, fields) ->
    if not @_current_if
      return @
    @_options.group_by = null
    schema_columns = Object.keys @_model._schema
    if typeof group_by is 'string'
      columns = group_by.split(/\s+/).filter (column) -> schema_columns.indexOf(column) >= 0
      @_options.group_by = columns
    @_options.group_fields = fields
    return @

  ##
  # Returns only one record (or null if does not exists).
  #
  # This is different from limit(1). limit(1) returns array of length 1 while this returns an instance.
  # @chainable
  one: ->
    if not @_current_if
      return @
    @_options.limit = 1
    @_options.one = true
    return @

  ##
  # Sets limit of query
  # @param {Number} limit
  # @chainable
  limit: (limit) ->
    if not @_current_if
      return @
    @_options.limit = limit
    return @

  ##
  # Sets skip of query
  # @param {Number} skip
  # @chainable
  skip: (skip) ->
    if not @_current_if
      return @
    @_options.skip = skip
    return @

  ##
  # Returns raw instances instead of model instances
  # @param {Boolean} lean=true
  # @chainable
  # @see Query::exec
  lean: (lean=true) ->
    if not @_current_if
      return @
    @_options.lean = lean
    return @

  ##
  # Makes a part of the query chain conditional
  # @param {Boolean} condition
  # @chainable
  # @see Query::endif
  if: (condition) ->
    @_ifs.push condition
    @_current_if and= condition
    return @

  ##
  # Ends last if
  # @chainable
  # @see Query::if
  endif: ->
    @_ifs.pop()
    @_current_if = true
    for condition in @_ifs
      @_current_if and= condition
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
  # @chainable
  cache: (options) ->
    if not @_current_if
      return @
    @_options.cache = options
    return @

  ##
  # Returns associated objects also
  # @param {String} column
  # @param {String} [select]
  # @chainable
  include: (column, select) ->
    if not @_current_if
      return @
    @_includes.push column: column, select: select
    return @

  ##
  # @private
  _exec: (options) ->
    if @_find_single_id and @_conditions.length is 0
      @_connection.log @_name, 'find by id', id: @_id, options: @_options if not options?.skip_log
      return Promise.reject new Error('not found') if not @_id
      return @_adapter.findByIdAsync @_name, @_id, @_options
      .catch (error) ->
        Promise.reject new Error('not found')
      .then (record) ->
        return Promise.reject new Error('not found') if not record
        return record
    expected_count = undefined
    if @_id or @_find_single_id
      if Array.isArray @_id
        return Promise.resolve [] if @_id.length is 0
        @_conditions.push id: { $in: @_id }
        expected_count = @_id.length
      else
        @_conditions.push id: @_id
        expected_count = 1
    @_connection.log @_name, 'find', conditions: @_conditions, options: @_options if not options?.skip_log
    @_adapter.findAsync @_name, @_conditions, @_options
    .then (records) =>
      if expected_count?
        return Promise.reject new Error('not found') if records.length isnt expected_count
      if @_preserve_order_ids
        records =  @_preserve_order_ids.map (id) ->
          for record in records
            return record if record.id is id
      if @_options.one
        return Promise.reject new Error('unknown error') if records.length > 1
        Promise.resolve if records.length is 1 then records[0] else null
      else
        Promise.resolve records

  ##
  # @private
  _execAndInclude: (options) ->
    @_exec options
    .then (records) =>
      promises = @_includes.map (include) =>
        @_connection.fetchAssociated records, include.column, include.select, model: @_model, lean: @_options.lean
      Promise.all(promises)
      .then ->
        records

  ##
  # Executes the query
  # @param {Object} [options]
  # @param {Boolean} [options.skip_log=false]
  # @return {Model|Array<Model>}
  # @promise
  # @nodejscallback
  # @see AdapterBase::findById
  # @see AdapterBase::find
  exec: (options, callback) ->
    if typeof options is 'function'
      callback = options
      options = {}

    @_model._checkReady().then =>
      if (cache_options = @_options.cache) and (cache_key = cache_options.key)
        # try cache
        @_model._loadFromCache cache_key, cache_options.refresh
        .catch (error) =>
          # no cache, execute query
          @_execAndInclude options
          .then (records) =>
            # save result to cache
            @_model._saveToCache cache_key, cache_options.ttl, records
            .then ->
              records
      else
        @_execAndInclude options
    .nodeify bindDomain callback

  ##
  # Explains the query
  # @return {Object}
  # @promise
  # @nodejscallback
  explain: (callback) ->
    @_options.cache = null
    @_options.explain = true
    @_includes = []
    @exec skip_log: true, callback

  ##
  # Executes the query as a promise (.then == .exec().then)
  # @param {Function} fulfilled
  # @param {Function} rejected
  # @promise
  then: (fulfilled, rejected) ->
    @exec().then fulfilled, rejected

  ##
  # Executes the query as a count operation
  # @return {Number}
  # @promise
  # @nodejscallback
  # @see AdapterBase::count
  count: (callback) ->
    @_model._checkReady().then =>
      if @_id or @_find_single_id
        @_conditions.push id: @_id
        delete @_id
      @_adapter.countAsync @_name, @_conditions, @_options
    .nodeify bindDomain callback

  ##
  # @private
  _validateAndBuildSaveData: (errors, data, updates, path, object) ->
    model = @_model
    schema = model._schema
    for column of object
      property = schema[path+column]
      if property
        try
          model._validateColumn updates, path+column, property, true
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
  # @return {Number}
  # @promise
  # @nodejscallback
  # @see AdapterBase::count
  update: (updates, callback) ->
    @_model._checkReady().then =>
      errors = []
      data = {}
      @_validateAndBuildSaveData errors, data, updates, '', updates
      if errors.length > 0
        return Promise.reject new Error errors.join ','

      if @_id or @_find_single_id
        @_conditions.push id: @_id
        delete @_id
      @_connection.log @_name, 'update', data: data, conditions: @_conditions, options: @_options
      @_adapter.updatePartialAsync @_name, data, @_conditions, @_options
    .nodeify bindDomain callback

  ##
  # Executes the query as an insert or update operation
  # @param {Object} updates
  # @return {Number}
  # @promise
  # @nodejscallback
  # @see AdapterBase::count
  upsert: (updates, callback) ->
    @_model._checkReady().then =>
      errors = []
      data = {}
      @_validateAndBuildSaveData errors, data, updates, '', updates
      if errors.length > 0
        return Promise.reject new Error errors.join ','

      if @_id or @_find_single_id
        @_conditions.push id: @_id
        delete @_id
      @_connection.log @_name, 'upsert', data: data, conditions: @_conditions, options: @_options
      @_adapter.upsertAsync @_name, data, @_conditions, @_options
    .nodeify bindDomain callback

  _doIntegrityActions: (integrities, ids) ->
    promises = integrities.map (integrity) =>
      if integrity.type is 'parent_nullify'
        integrity.child.update _.object([integrity.column], [null]), _.object([integrity.column], [ids])
      else if integrity.type is 'parent_restrict'
        integrity.child.count _.object [integrity.column], [ids]
        .then (count) ->
          Promise.reject new Error 'rejected' if count>0
      else if integrity.type is 'parent_delete'
        integrity.child.delete _.object [integrity.column], [ids]
    Promise.all promises

  ##
  # @private
  _doArchiveAndIntegrity: (options) ->
    need_archive = @_model.archive
    integrities = @_model._integrities.filter (integrity) -> integrity.type.substr(0, 7) is 'parent_'
    need_child_archive = integrities.some (integrity) => integrity.child.archive
    need_integrity = need_child_archive or (integrities.length > 0 and not @_adapter.native_integrity)
    return Promise.resolve() if not need_archive and not need_integrity

    # find all records to be deleted
    query = @_model.where @_conditions
    query.select '' if not need_archive # we need only id field for integrity
    query.exec skip_log: options?.skip_log
    .then (records) =>
      return Promise.resolve records if not need_archive
      archive_records = records.map (record) => model: @_name, data: record
      @_connection.models['_Archive'].createBulk archive_records
      .then ->
        Promise.resolve records
    .then (records) =>
      return Promise.resolve() if not need_integrity
      return Promise.resolve() if records.length is 0
      ids = records.map (record) -> record.id
      @_doIntegrityActions integrities, ids

  ##
  # Executes the query as a delete operation
  # @param {Object} [options]
  # @param {Boolean} [options.skip_log=false]
  # @return {Number}
  # @promise
  # @nodejscallback
  # @see AdapterBase::delete
  delete: (options, callback) ->
    if typeof options is 'function'
      callback = options
      options = {}
    @_model._checkReady().then =>
      if @_id or @_find_single_id
        @_conditions.push id: @_id
        delete @_id
      @_connection.log @_name, 'delete', conditions: @_conditions if not options?.skip_log

      @_doArchiveAndIntegrity options
      .then =>
        @_adapter.deleteAsync @_name, @_conditions
    .nodeify bindDomain callback

module.exports = Query
