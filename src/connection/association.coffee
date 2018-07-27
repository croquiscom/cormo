_ = require 'lodash'
inflector = require '../util/inflector'
types = require '../types'

##
# Makes association between two models
# @namespace connection
ConnectionAssociationMixin = (Base) -> class extends Base
  ##
  # Adds a has-many association
  # @param {Class<Model>} this_model
  # @param {Class<Model>} target_model
  # @param {Object} [options]
  # @param {String} [options.as]
  # @param {String} [options.foreign_key]
  # @param {String} [options.integrity='ignore'] 'ignore', 'nullify'
  # @private
  _hasMany: (this_model, target_model, options) ->
    if options?.foreign_key
      foreign_key = options.foreign_key
    else if options?.as
      foreign_key = options.as + '_id'
    else
      foreign_key = inflector.foreign_key this_model._name
    target_model.column foreign_key, type: types.RecordID, connection: this_model._connection

    integrity = options?.integrity or 'ignore'
    target_model._integrities.push type: 'child_'+integrity, column: foreign_key, parent: this_model
    this_model._integrities.push type: 'parent_'+integrity, column: foreign_key, child: target_model

    column = options?.as or inflector.tableize(target_model._name)
    columnCache = '__cache_' + column
    columnGetter = '__getter_' + column

    this_model._associations[column] = { type: 'hasMany', target_model: target_model, foreign_key: foreign_key }

    Object.defineProperty this_model.prototype, column,
      get: ->
        # getter must be created per instance due to __scope
        if not @.hasOwnProperty columnGetter
          getter = (reload) ->
            # @ is getter.__scope in normal case (this_model_instance.target_model_name()),
            # but use getter.__scope for safety
            self = getter.__scope
            if (not self[columnCache] or reload) and self.id
              records = await target_model.where _.zipObject [foreign_key], [self.id]
              self[columnCache] = records
              records
            else
              self[columnCache] or []
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

  ##
  # Adds a has-one association
  # @param {Class<Model>} this_model
  # @param {Class<Model>} target_model
  # @param {Object} [options]
  # @private
  _hasOne: (this_model, target_model, options) ->
    if options?.foreign_key
      foreign_key = options.foreign_key
    else if options?.as
      foreign_key = options.as + '_id'
    else
      foreign_key = inflector.foreign_key this_model._name
    target_model.column foreign_key, type: types.RecordID, connection: this_model._connection

    integrity = options?.integrity or 'ignore'
    target_model._integrities.push type: 'child_'+integrity, column: foreign_key, parent: this_model
    this_model._integrities.push type: 'parent_'+integrity, column: foreign_key, child: target_model

    column = options?.as or inflector.underscore(target_model._name)
    columnCache = '__cache_' + column
    columnGetter = '__getter_' + column

    this_model._associations[column] = { type: 'hasOne', target_model: target_model }

    Object.defineProperty this_model.prototype, column,
      get: ->
        # getter must be created per instance due to __scope
        if not @.hasOwnProperty columnGetter
          getter = (reload) ->
            # @ is getter.__scope in normal case (this_model_instance.target_model_name()),
            # but use getter.__scope for safety
            self = getter.__scope
            if (not self[columnCache] or reload) and self.id
              records = await target_model.where _.zipObject [foreign_key], [self.id]
              if records.length > 1
                throw new Error('integrity error')
              record = if records.length is 0 then null else records[0]
              self[columnCache] = record
              record
            else
              self[columnCache]
          getter.__scope = @
          Object.defineProperty @, columnCache, value: null, writable: true
          Object.defineProperty @, columnGetter, value: getter
        return @[columnGetter]

  ##
  # Adds a belongs-to association
  # @param {Class<Model>} this_model
  # @param {Class<Model>} target_model
  # @param {Object} [options]
  # @param {String} [options.as]
  # @param {String} [options.foreign_key]
  # @private
  _belongsTo: (this_model, target_model, options) ->
    if options?.foreign_key
      foreign_key = options.foreign_key
    else if options?.as
      foreign_key = options.as + '_id'
    else
      foreign_key = inflector.foreign_key target_model._name
    this_model.column foreign_key, type: types.RecordID, connection: target_model._connection, required: options?.required

    column = options?.as or inflector.underscore(target_model._name)
    columnCache = '__cache_' + column
    columnGetter = '__getter_' + column

    this_model._associations[column] = { type: 'belongsTo', target_model: target_model }

    Object.defineProperty this_model.prototype, column,
      get: ->
        # getter must be created per instance due to __scope
        if not @.hasOwnProperty columnGetter
          getter = (reload) ->
            # @ is getter.__scope in normal case (this_model_instance.target_model_name()),
            # but use getter.__scope for safety
            self = getter.__scope
            if (not self[columnCache] or reload) and self[foreign_key]
              record = await target_model.find self[foreign_key]
              self[columnCache] = record
              record
            else
              self[columnCache]
          getter.__scope = @
          Object.defineProperty @, columnCache, value: null, writable: true
          Object.defineProperty @, columnGetter, value: getter
        return @[columnGetter]

  ##
  # Applies pending associations
  # @param {Connection} connection
  # @param {Array<Object>} associations
  # @param {String} associations.type 'hasMany' or 'belongsTo'
  # @private
  _applyAssociations: ->
    for item in @_pending_associations
      this_model = item.this_model
      options = item.options
      if typeof item.target_model_or_column is 'string'
        if item.options?.connection
          models = item.options.connection.models
        else
          models = @models
        if item.options?.type
          target_model = item.options.type
          options.as = item.target_model_or_column
        else if item.type is 'belongsTo' or item.type is 'hasOne'
          target_model = inflector.camelize item.target_model_or_column
        else
          target_model = inflector.classify item.target_model_or_column
        if not models[target_model]
          throw new Error("model #{target_model} does not exist")
        target_model = models[target_model]
      else
        target_model = item.target_model_or_column
      @['_'+item.type] this_model, target_model, options

    @_pending_associations = []

  ##
  # Adds an association
  # @param {Object} association
  # @param {String} association.type 'hasMany' or 'belongsTo'
  # @param {Class<Model>} association.this_model
  # @param {Class<Model>|String} association.target_model_or_column
  # @param {Object} [association.options]
  # @param {String} [association.options.type]
  # @param {String} [association.options.as]
  # @param {String} [association.options.foreign_key]
  # @see Model.hasMany
  # @see Model.belongsTo
  addAssociation: (association) ->
    @_pending_associations.push association
    @_schema_changed = true

  ##
  # Returns inconsistent records against associations
  # @return {Object} Hash of model name to Array of RecordIDs
  # @promise
  getInconsistencies: ->
    await @_checkSchemaApplied()
    result = {}
    promises = Object.keys(@models).map (model) =>
      modelClass = @models[model]
      integrities = modelClass._integrities.filter (integrity) -> integrity.type.substr(0, 7) is 'parent_'
      if integrities.length > 0
        records = await modelClass.select ''
        ids = records.map (record) -> record.id
        sub_promises = integrities.map (integrity) =>
          query = integrity.child.select ''
          query.where _.zipObject [integrity.column], [$not: $in: ids]
          property = integrity.child._schema[integrity.column]
          if not property.required
            query.where _.zipObject [integrity.column], [$not: null]
          records = await query.exec()
          if records.length > 0
            array = result[integrity.child._name] ||= []
            [].push.apply array, records.map (record) -> record.id
            _.uniq array
        await Promise.all sub_promises
    await Promise.all promises
    result

  _fetchAssociatedBelongsTo: (records, target_model, column, select, options) ->
    id_column = column + '_id'
    if Array.isArray records
      id_to_record_map = {}
      records.forEach (record) ->
        id = record[id_column]
        if id
          (id_to_record_map[id] ||= []).push record
        return
      ids = Object.keys id_to_record_map
      query = target_model.where id: ids
      query.select select if select
      query.lean() if options.lean
      try
        sub_records = await query.exec()
        sub_records.forEach (sub_record) ->
          id_to_record_map[sub_record.id].forEach (record) ->
            if options.lean
              record[column] = sub_record
            else
              Object.defineProperty record, column, enumerable: true, value: sub_record
        records.forEach (record) ->
          if not record.hasOwnProperty column
            if options.lean
              record[column] = null
            else
              Object.defineProperty record, column, enumerable: true, value: null
          return
      catch
    else
      id = records[id_column]
      if id
        query = target_model.find(id)
        query.select select if select
        query.lean() if options.lean
        try
          sub_record = await query.exec()
          if options.lean
            records[column] = sub_record
          else
            Object.defineProperty records, column, enumerable: true, value: sub_record
        catch error
          if error and error.message isnt 'not found'
            throw error
          if not records.hasOwnProperty column
            if options.lean
              records[column] = null
            else
              Object.defineProperty records, column, enumerable: true, value: null
      else if not records.hasOwnProperty column
        if options.lean
          records[column] = null
        else
          Object.defineProperty records, column, enumerable: true, value: null
    return

  _fetchAssociatedHasMany: (records, target_model, foreign_key, column, select, options) ->
    if Array.isArray records
      ids = records.map (record) ->
        if options.lean
          record[column] = []
        else
          Object.defineProperty record, column, enumerable: true, value: []
        record.id
      query = target_model.where _.zipObject [foreign_key], [$in: ids]
      query.select select + ' ' + foreign_key if select
      query.lean() if options.lean
      try
        sub_records = await query.exec()
        sub_records.forEach (sub_record) ->
          records.forEach (record) ->
            record[column].push sub_record if record.id is sub_record[foreign_key]
      catch
    else
      if options.lean
        records[column] = []
      else
        Object.defineProperty records, column, enumerable: true, value: []
      query = target_model.where _.zipObject [foreign_key], [records.id]
      query.select select + ' ' + foreign_key if select
      query.lean() if options.lean
      try
        sub_records = await query.exec()
        sub_records.forEach (sub_record) ->
          records[column].push sub_record
      catch
    return

  ##
  # Fetches associated records
  # @param {Model|Array<Model>} records
  # @param {String} column
  # @param {String} [select]
  # @param {Object} [options]
  # @promise
  fetchAssociated: (records, column, select, options) ->
    if select? and typeof select is 'object'
      options = select
      select = null
    else if not options?
      options = {}

    await @_checkSchemaApplied()
    record = if Array.isArray records then records[0] else records
    if not record
      return
    if options.target_model
      association = type: options.type or 'belongsTo', target_model: options.target_model, foreign_key: options.foreign_key
    else if options.model
      association = options.model._associations?[column]
    else
      association = record.constructor._associations?[column]
    if not association
      throw new Error("unknown column '#{column}'")
    if association.type is 'belongsTo'
      await @_fetchAssociatedBelongsTo records, association.target_model, column, select, options
    else if association.type is 'hasMany'
      await @_fetchAssociatedHasMany records, association.target_model, association.foreign_key, column, select, options
    else
      throw new Error("unknown column '#{column}'")

module.exports = ConnectionAssociationMixin
