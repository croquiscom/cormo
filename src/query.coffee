_ = require 'lodash'
stream = require 'stream'

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
      if not @_id
        throw new Error('not found')
      try
        record = await @_adapter.findById @_name, @_id, @_options
      catch error
        throw new Error('not found')
      if not record
        throw new Error('not found')
      return record
    expected_count = undefined
    if @_id or @_find_single_id
      if Array.isArray @_id
        return [] if @_id.length is 0
        @_conditions.push id: { $in: @_id }
        expected_count = @_id.length
      else
        @_conditions.push id: @_id
        expected_count = 1
    @_connection.log @_name, 'find', conditions: @_conditions, options: @_options if not options?.skip_log
    records = await @_adapter.find @_name, @_conditions, @_options
    if expected_count?
      if records.length isnt expected_count
        throw new Error('not found')
    if @_preserve_order_ids
      records =  @_preserve_order_ids.map (id) ->
        for record in records
          return record if record.id is id
    if @_options.one
      if records.length > 1
        throw new Error('unknown error')
      return if records.length is 1 then records[0] else null
    else
      return records

  ##
  # @private
  _execAndInclude: (options) ->
    records = await @_exec options
    await Promise.all @_includes.map (include) =>
      await @_connection.fetchAssociated records, include.column, include.select, model: @_model, lean: @_options.lean
    records

  ##
  # Executes the query
  # @param {Object} [options]
  # @param {Boolean} [options.skip_log=false]
  # @return {Model|Array<Model>}
  # @promise
  # @see AdapterBase::findById
  # @see AdapterBase::find
  exec: (options) ->
    await @_model._checkReady()
    if (cache_options = @_options.cache) and (cache_key = cache_options.key)
      # try cache
      try
        await @_model._loadFromCache cache_key, cache_options.refresh
      catch error
        # no cache, execute query
        records = await @_execAndInclude options
        # save result to cache
        await @_model._saveToCache cache_key, cache_options.ttl, records
        records
    else
      await @_execAndInclude options

  ##
  # Executes the query and returns a readable stream
  # @param {Object} [options]
  # @param {Boolean} [options.skip_log=false]
  # @return {Readable}
  # @see AdapterBase::findById
  # @see AdapterBase::find
  stream: ->
    transformer = new stream.Transform objectMode: true
    transformer._transform = (chunk, encoding, callback) ->
      @push chunk
      callback()
    @_model._checkReady().then =>
      @_adapter.stream(@_name, @_conditions, @_options)
      .on 'error', (error) ->
        transformer.emit 'error', error
      .pipe transformer
    transformer

  ##
  # Explains the query
  # @return {Object}
  # @promise
  explain: ->
    @_options.cache = null
    @_options.explain = true
    @_includes = []
    await @exec skip_log: true

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
  # @see AdapterBase::count
  count: ->
    await @_model._checkReady()
    if @_id or @_find_single_id
      @_conditions.push id: @_id
      delete @_id
    await @_adapter.count @_name, @_conditions, @_options

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
    return

  ##
  # Executes the query as a update operation
  # @param {Object} updates
  # @return {Number}
  # @promise
  # @see AdapterBase::count
  update: (updates) ->
    await @_model._checkReady()
    errors = []
    data = {}
    @_validateAndBuildSaveData errors, data, updates, '', updates
    if errors.length > 0
      throw new Error errors.join ','

    if @_id or @_find_single_id
      @_conditions.push id: @_id
      delete @_id
    @_connection.log @_name, 'update', data: data, conditions: @_conditions, options: @_options
    await @_adapter.updatePartial @_name, data, @_conditions, @_options

  ##
  # Executes the query as an insert or update operation
  # @param {Object} updates
  # @return {Number}
  # @promise
  # @see AdapterBase::count
  upsert: (updates) ->
    await @_model._checkReady()
    errors = []
    data = {}
    @_validateAndBuildSaveData errors, data, updates, '', updates
    if errors.length > 0
      throw new Error errors.join ','

    if @_id or @_find_single_id
      @_conditions.push id: @_id
      delete @_id
    @_connection.log @_name, 'upsert', data: data, conditions: @_conditions, options: @_options
    await @_adapter.upsert @_name, data, @_conditions, @_options

  _doIntegrityActions: (integrities, ids) ->
    promises = integrities.map (integrity) =>
      if integrity.type is 'parent_nullify'
        await integrity.child.update _.zipObject([integrity.column], [null]), _.zipObject([integrity.column], [ids])
      else if integrity.type is 'parent_restrict'
        count = await integrity.child.count _.zipObject [integrity.column], [ids]
        if count > 0
          throw new Error 'rejected'
      else if integrity.type is 'parent_delete'
        await integrity.child.delete _.zipObject [integrity.column], [ids]
    await Promise.all promises

  ##
  # @private
  _doArchiveAndIntegrity: (options) ->
    need_archive = @_model.archive
    integrities = @_model._integrities.filter (integrity) -> integrity.type.substr(0, 7) is 'parent_'
    need_child_archive = integrities.some (integrity) => integrity.child.archive
    need_integrity = need_child_archive or (integrities.length > 0 and not @_adapter.native_integrity)
    if not need_archive and not need_integrity
      return

    # find all records to be deleted
    query = @_model.where @_conditions
    if not need_archive # we need only id field for integrity
      query.select ''
    records = await query.exec skip_log: options?.skip_log
    if need_archive
      archive_records = records.map (record) => model: @_name, data: record
      await @_connection.models['_Archive'].createBulk archive_records
    if not need_integrity
      return
    if records.length is 0
      return
    ids = records.map (record) -> record.id
    await @_doIntegrityActions integrities, ids
    return

  ##
  # Executes the query as a delete operation
  # @param {Object} [options]
  # @param {Boolean} [options.skip_log=false]
  # @return {Number}
  # @promise
  # @see AdapterBase::delete
  delete: (options) ->
    await @_model._checkReady()
    if @_id or @_find_single_id
      @_conditions.push id: @_id
      delete @_id
    @_connection.log @_name, 'delete', conditions: @_conditions if not options?.skip_log

    await @_doArchiveAndIntegrity options
    await @_adapter.delete @_name, @_conditions

module.exports = Query
