_ = require 'underscore'
inflector = require '../inflector'
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

    this_model._associations[column] = { type: 'hasMany' }

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
            self = getter.__scope
            if (not self[columnCache] or reload) and self.id
              conditions = {}
              conditions[foreign_key] = self.id
              target_model.where conditions, (error, records) ->
                return callback error if error
                self[columnCache] = records
                callback null, records
            else
              callback null, self[columnCache] or []
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
    this_model.column foreign_key, type: types.RecordID, connection: target_model._connection

    column = options?.as or inflector.underscore(target_model._name)
    columnCache = '__cache_' + column
    columnGetter = '__getter_' + column

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
            self = getter.__scope
            if (not self[columnCache] or reload) and self[foreign_key]
              target_model.find self[foreign_key], (error, record) ->
                return callback error if error
                self[columnCache] = record
                callback null, record
            else
              callback null, self[columnCache]
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
        else if item.type is 'belongsTo'
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
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Object} callback.inconsistencies Hash of model name to Array of RecordIDs
  getInconsistencies: (callback) ->
    result = {}
    async.forEach Object.keys(@models), (model, callback) =>
      modelClass = @models[model]
      integrities = modelClass._integrities.filter (integrity) -> integrity.type.substr(0, 7) is 'parent_'
      if integrities.length > 0
        modelClass.select '', (error, records) =>
          ids = records.map (record) -> record.id
          async.forEach integrities, (integrity, callback) =>
            query = integrity.child.select ''
            conditions = {}
            conditions[integrity.column] = $not: $in: ids
            query.where(conditions)
            if integrity.type is 'parent_nullify'
              conditions = {}
              conditions[integrity.column] = $not: null
              query.where(conditions)
            query.exec (error, records) ->
              return callback error if error
              return callback null if records.length is 0
              array = result[integrity.child._name] ||= []
              [].push.apply array, records.map (record) -> record.id
              _.uniq array
              callback null
          , (error) ->
            callback null
      else
        callback null
    , (error) ->
      return callback error if error
      callback null, result

module.exports = ConnectionAssociation
