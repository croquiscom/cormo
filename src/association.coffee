##
# Makes association between two models
# @module association
# @namespace cormo

inflector = require './inflector'
types = require './types'

##
# Adds a has-many association
# @param {Class<Model>} this_model
# @param {Class<Model>} target_model
# @param {Object} [options]
# @param {String} [options.as]
# @param {String} [options.foreign_key]
# @memberOf association
exports.hasMany = (this_model, target_model, options) ->
  if options?.foreign_key
    foreign_key = options.foreign_key
  else if options?.as
    foreign_key = options.as + '_id'
  else
    foreign_key = inflector.foreign_key this_model._name
  target_model.column foreign_key, type: types.RecordID, connection: this_model._connection

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
# @memberOf association
exports.belongsTo = (this_model, target_model, options) ->
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
# @memberOf association
exports.applyAssociations = (connection, associations) ->
  associations.forEach (item) ->
    this_model = item.this_model
    options = item.options
    if typeof item.target_model_or_column is 'string'
      if item.options?.connection
        models = item.options.connection.models
      else
        models = connection.models
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
    exports[item.type] this_model, target_model, options
