_ = require 'underscore'
{bindDomain} = require '../util'
inflector = require '../util/inflector'
Promise = require 'bluebird'
types = require '../types'

##
# Makes association between two models
# @namespace connection
class ConnectionAssociation
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
          getter = (reload, callback) ->
            if typeof reload is 'function'
              callback = reload
              reload = false
            # @ is getter.__scope in normal case (this_model_instance.target_model_name()),
            # but use getter.__scope for safety
            Promise.resolve()
            .then ->
              self = getter.__scope
              if (not self[columnCache] or reload) and self.id
                conditions = {}
                conditions[foreign_key] = self.id
                target_model.where conditions
                .exec()
                .then (records) ->
                  self[columnCache] = records
                  Promise.resolve records
              else
                Promise.resolve self[columnCache] or []
            .nodeify callback
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
          getter = (reload, callback) ->
            if typeof reload is 'function'
              callback = reload
              reload = false
            # @ is getter.__scope in normal case (this_model_instance.target_model_name()),
            # but use getter.__scope for safety
            Promise.resolve()
            .then ->
              self = getter.__scope
              if (not self[columnCache] or reload) and self.id
                conditions = {}
                conditions[foreign_key] = self.id
                target_model.where conditions
                .exec()
                .then (records) ->
                  return Promise.reject new Error('integrity error') if records.length > 1
                  record = if records.length is 0 then null else records[0]
                  self[columnCache] = record
                  Promise.resolve record
              else
                Promise.resolve self[columnCache]
            .nodeify callback
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
          getter = (reload, callback) ->
            if typeof reload is 'function'
              callback = reload
              reload = false
            # @ is getter.__scope in normal case (this_model_instance.target_model_name()),
            # but use getter.__scope for safety
            Promise.resolve()
            .then ->
              self = getter.__scope
              if (not self[columnCache] or reload) and self[foreign_key]
                target_model.find self[foreign_key]
                .exec()
                .then (record) ->
                  self[columnCache] = record
                  Promise.resolve record
              else
                Promise.resolve self[columnCache]
            .nodeify callback
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
    @_pending_associations.forEach (item) =>
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
        throw new Error("model #{target_model} does not exist") if not models[target_model]
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
  # @nodejscallback
  getInconsistencies: (callback) ->
    @_checkSchemaApplied().then =>
      result = {}
      promises = Object.keys(@models).map (model) =>
        modelClass = @models[model]
        integrities = modelClass._integrities.filter (integrity) -> integrity.type.substr(0, 7) is 'parent_'
        if integrities.length > 0
          modelClass.select ''
          .exec()
          .then (records) =>
            ids = records.map (record) -> record.id
            sub_promises = integrities.map (integrity) =>
              query = integrity.child.select ''
              conditions = {}
              conditions[integrity.column] = $not: $in: ids
              query.where(conditions)
              property = integrity.child._schema[integrity.column]
              if not property.required
                conditions = {}
                conditions[integrity.column] = $not: null
                query.where(conditions)
              query.exec()
              .then (records) ->
                if records.length > 0
                  array = result[integrity.child._name] ||= []
                  [].push.apply array, records.map (record) -> record.id
                  _.uniq array
            Promise.all sub_promises
        else
          Promise.resolve()
      Promise.all promises
      .then ->
        Promise.resolve result
    .nodeify callback

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
      query.exec()
      .then (sub_records) ->
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
      .catch ->
    else
      id = records[id_column]
      if id
        query = target_model.find(id)
        query.select select if select
        query.lean() if options.lean
        query.exec()
        .then (sub_record) ->
          if options.lean
            records[column] = sub_record
          else
            Object.defineProperty records, column, enumerable: true, value: sub_record
        .catch (error) ->
          return Promise.reject error if error and error.message isnt 'not found'
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
        Promise.resolve()

  _fetchAssociatedHasMany: (records, target_model, foreign_key, column, select, options) ->
    if Array.isArray records
      ids = records.map (record) ->
        if options.lean
          record[column] = []
        else
          Object.defineProperty record, column, enumerable: true, value: []
        record.id
      cond = {}
      cond[foreign_key] = $in: ids
      query = target_model.where cond
      query.select select + ' ' + foreign_key if select
      query.lean() if options.lean
      query.exec()
      .then (sub_records) ->
        sub_records.forEach (sub_record) ->
          records.forEach (record) ->
            record[column].push sub_record if record.id is sub_record[foreign_key]
      .catch ->
    else
      if options.lean
        records[column] = []
      else
        Object.defineProperty records, column, enumerable: true, value: []
      cond = {}
      cond[foreign_key] = records.id
      query = target_model.where cond
      query.select select + ' ' + foreign_key if select
      query.lean() if options.lean
      query.exec()
      .then (sub_records) ->
        sub_records.forEach (sub_record) ->
          records[column].push sub_record
      .catch ->

  ##
  # Fetches associated records
  # @param {Model|Array<Model>} records
  # @param {String} column
  # @param {String} [select]
  # @param {Object} [options]
  # @promise
  # @nodejscallback
  fetchAssociated: (records, column, select, options, callback) ->
    if typeof select is 'function'
      callback = select
      options = {}
      select = null
    else if typeof options is 'function'
      callback = options
      options = {}
      if typeof select is 'object'
        options = select
        select = null
    else
      if typeof select is 'object'
        options = select
        select = null
      else if not options?
        options = {}

    @_checkSchemaApplied().then =>
      record = if Array.isArray records then records[0] else records
      return Promise.resolve() if not record
      if options.target_model
        association = type: options.type or 'belongsTo', target_model: options.target_model, foreign_key: options.foreign_key
      else if options.model
        association = options.model._associations?[column]
      else
        association = record.constructor._associations?[column]
      return Promise.reject new Error("unknown column '#{column}'") if not association
      if association.type is 'belongsTo'
        @_fetchAssociatedBelongsTo records, association.target_model, column, select, options
      else if association.type is 'hasMany'
        @_fetchAssociatedHasMany records, association.target_model, association.foreign_key, column, select, options
      else
        Promise.reject new Error("unknown column '#{column}'")
    .nodeify bindDomain callback

module.exports = ConnectionAssociation
