_ = require 'lodash'
tableize = require('../util/inflector').tableize
types = require '../types'
util = require '../util'

_pf_isDirty = -> true
_pf_getChanged = -> []
_pf_get = (path) -> util.getPropertyOfPath @, path.split '.'
_pf_getPrevious = ->
_pf_set = (path, value) -> util.setPropertyOfPath @, path.split('.'), value
_pf_reset = ->

##
# Properties of a column of a model
class ColumnProperty
  ##
  # @property type

  ##
  # @property required

  ##
  # @property unique

  ##
  # @property _parts
  # @private

  ##
  # Name for SQL dbs.
  # e.g.) name.first -> name_first
  # @property _dbname
  # @private

##
# Base class for models
# @uses ModelQuery
# @uses ModelCallback
# @uses ModelTimestamp
# @uses ModelPersistence
# @uses ModelValidate
# @uses ModelCache
class ModelBase
  ##
  # Tracks changes of a record if true
  # @type Boolean
  @dirty_tracking: false

  ##
  # Archives deleted records in the archive table
  @archive: false

  ##
  # Applies the lean option for all queries for this Model
  @lean_query: false

  ##
  # @property tableName
  # @type String
  # @static

  ##
  # Indicates the connection associated to this model
  # @property _connection
  # @type Connection
  # @private
  # @static
  # @see Model.connection

  ##
  # Indicates the adapter associated to this model
  # @property _adapter
  # @type AdapterBase
  # @private
  # @static
  # @see Model.connection

  ##
  # Schema for this model.
  # Maps from column path to property object
  # @property _schema
  # @type StringMap<Object>
  # @private
  # @static
  # @see Model.connection

  ##
  # Returns a new model class extending Model
  # @param {Connection} connection
  # @param {String} name
  # @param {Object} schema
  # @return {Class<Model>}
  @newModel: (connection, name, schema) ->
    class NewModel extends Model
    NewModel.connection connection, name
    for name, property of schema
      NewModel.column name, property
    return NewModel

  ##
  # Sets a connection of this model
  #
  # If this methods was not called explicitly, this model will use Connection.defaultConnection
  # @param {Connection} connection
  # @param {String} [name]
  @connection: (connection, name) ->
    if @hasOwnProperty '_connection'
      throw new Error 'Model::connection was called twice'

    name = @name if not name
    connection.models[name] = @
    connection[name] = @

    Object.defineProperty @, '_connection', value: connection
    Object.defineProperty @, '_adapter', value: connection._adapter
    Object.defineProperty @, '_associations', value: {}
    Object.defineProperty @, '_validators', value: []
    Object.defineProperty @, '_name', value: name
    Object.defineProperty @, '_schema', value: {}
    Object.defineProperty @, '_intermediate_paths', value: {}
    Object.defineProperty @, '_indexes', value: []
    Object.defineProperty @, '_integrities', value: []

    @tableName = tableize name if not @tableName

  @_checkConnection: ->
    return if @hasOwnProperty '_connection'
    if not Model._Connection.defaultConnection?
      throw new Error 'Create a Connection before creating a Model'
    @connection Model._Connection.defaultConnection

  @_checkReady: ->
    @_checkConnection()
    await Promise.all [@_connection._checkSchemaApplied(), @_connection._promise_connection]

  @_getKeyType: (target_connection = @_connection) ->
    if @_connection is target_connection and target_connection._adapter.key_type_internal
      new target_connection._adapter.key_type_internal
    else
      new target_connection._adapter.key_type

  ##
  # Adds a column to this model
  # @param {String} path
  # @param {Function|String|ColumnProperty} property
  @column: (path, property) ->
    @_checkConnection()

    # nested path
    if _.isPlainObject(property) and (not property.type or property.type.type)
      for subcolumn, subproperty of property
        @column path+'.'+subcolumn, subproperty
      return

    if @_schema.hasOwnProperty path
      # if using association, a column may be defined more than twice (by hasMany and belongsTo, for example)
      # overwrite some properties if given later
      if property?.required?
        @_schema[path].required = property.required
      return

    # convert simple type to property object
    if not _.isPlainObject property
      property = type: property

    if Array.isArray property.type
      property.array = true
      property.type = property.type[0]

    type = types._toCORMOType property.type
    if type.constructor is types.RecordID
      type = @_getKeyType property.connection
      property.record_id = true

    # check supports of GeoPoint
    if type.constructor is types.GeoPoint and not @_adapter.support_geopoint
      throw new Error 'this adapter does not support GeoPoint type'
    if type.constructor is types.String and type.length and not @_adapter.support_string_type_with_length
      throw new Error 'this adapter does not support String type with length'

    parts = path.split '.'
    for i in [0...parts.length-1]
      @_intermediate_paths[parts[0..i].join '.'] = 1

    property.type = type
    property.type_class = type.constructor
    property._parts = path.split '.'
    property._dbname = path.replace /\./g, '_'

    @_schema[path] = property

    if property.unique
      @_indexes.push columns: _.zipObject([property._dbname], [1]), options: name: property._dbname, unique: true, required: property.required

    @_connection._schema_changed = true

  ##
  # Adds an index to this model
  # @param {Object} columns hash of <column, order>
  # @param {Object} [options]
  # @param {Boolean} [options.unique]
  @index: (columns, options) ->
    @_checkConnection()

    options ||= {}
    if not options.name
      options.name = Object.keys(columns).join('_')
    @_indexes.push columns: columns, options: options

    @_connection._schema_changed = true

  ##
  # Drops this model from the database
  # @promise
  # @see AdapterBase::drop
  @drop: ->
    # do not need to apply schema before drop, only waiting connection established
    try
      await @_connection._promise_connection
      await @_adapter.drop @_name
    finally
      @_connection._schema_changed = true

  ##
  # Creates a record.
  # 'Model.build(data)' is the same as 'new Model(data)'
  # @param {Object} [data={}]
  # @return {Model}
  @build: (data) ->
    return new @ data

  ##
  # @property _prev_attributes
  # @private

  ##
  # @property _attributes
  # @private

  ##
  # @property _intermediates
  # @private

  ##
  # Creates a record
  # @param {Object} [data={}]
  constructor: (data) ->
    data = data or {}
    ctor = @constructor
    schema = ctor._schema
    adapter = ctor._adapter

    Object.defineProperty @, '_prev_attributes', writable: true, value: {}
    if ctor.dirty_tracking
      Object.defineProperty @, '_attributes', value: {}
      Object.defineProperty @, '_intermediates', value: {}
      for path in Object.keys(ctor._intermediate_paths).sort()
        [obj, last] = util.getLeafOfPath @, path
        @_intermediates[path] = {}
        @_defineProperty obj, last, path, false
      for column, property of schema
        [obj, last] = util.getLeafOfPath @, property._parts
        @_defineProperty obj, last, column, false
    else
      Object.defineProperty @, 'isDirty', value: _pf_isDirty
      Object.defineProperty @, 'getChanged', value: _pf_getChanged
      Object.defineProperty @, 'get', value: _pf_get
      Object.defineProperty @, 'getPrevious', value: _pf_getPrevious
      Object.defineProperty @, 'set', value: _pf_set
      Object.defineProperty @, 'reset', value: _pf_reset

    if id = arguments[1]
      # if id exists, this is called from adapter with database record data
      selected_columns = arguments[2]
      selected_columns_raw = arguments[3]
      adapter.setValuesFromDB @, data, schema, selected_columns

      ctor._collapseNestedNulls @, selected_columns_raw, if ctor.dirty_tracking then @_intermediates

      Object.defineProperty @, 'id', configurable: false, enumerable: true, writable: false, value: id

      @_runCallbacks 'find', 'after'
    else
      for column, property of schema
        parts = property._parts
        value = util.getPropertyOfPath data, parts
        if value is undefined
          value = null
        util.setPropertyOfPath @, parts, value

      ctor._collapseNestedNulls @, null, if ctor.dirty_tracking then @_intermediates

      Object.defineProperty @, 'id', configurable: true, enumerable: true, writable: false, value: null

    @_runCallbacks 'initialize', 'after'

  ##
  # Set nested object null if all children are null
  @_collapseNestedNulls: (instance, selected_columns_raw, intermediates) ->
    for path in Object.keys(@_intermediate_paths)
      if selected_columns_raw and selected_columns_raw.indexOf(path) is -1
        continue
      if intermediates
        obj = intermediates
        last = path
      else
        [obj, last] = util.getLeafOfPath instance, path
      has_non_null = false
      for key, value of obj[last]
        has_non_null = true if value?
      if not has_non_null
        obj[last] = null

  _defineProperty: (object, key, path, enumerable) ->
    Object.defineProperty object, key,
      configurable: true
      enumerable: enumerable
      get: => @get path
      set: (value) => @set path, value

  ##
  # Returns true if there is some changed columns
  isDirty: ->
    Object.keys(@_prev_attributes).length > 0

  ##
  # Returns the list of paths of changed columns
  getChanged: ->
    Object.keys @_prev_attributes

  ##
  # Returns the current value of the column of the given path
  # @param {String} path
  # @return {*}
  get: (path) ->
    if @_intermediates.hasOwnProperty path
      @_intermediates[path]
    else
      util.getPropertyOfPath @_attributes, path

  ##
  # Returns the original value of the column of the given path
  # @param {String} path
  # @return {*}
  getPrevious: (path) ->
    @_prev_attributes[path]

  ##
  # Changes the value of the column of the given path
  # @param {String} path
  # @param {*} value
  # @return {*}
  set: (path, value) ->
    if @_intermediates.hasOwnProperty path
      obj = @_intermediates[path]
      for k of obj
        obj[k] = undefined
      for k, v of value
        obj[k] = v
    else
      parts = path.split '.'
      prev_value = util.getPropertyOfPath @_attributes, parts
      return if prev_value is value
      if not @_prev_attributes.hasOwnProperty path
        @_prev_attributes[path] = prev_value
      [obj, last] = util.getLeafOfPath @, parts
      @_defineProperty obj, last, path, true
      util.setPropertyOfPath @_attributes, parts, value
      while parts.length > 1
        parts.pop()
        [obj, last] = util.getLeafOfPath @, parts
        @_defineProperty obj, last, parts.join('.'), true

  ##
  # Resets all changes
  reset: ->
    for path, value of @_prev_attributes
      @set path, value
    @_prev_attributes = {}

  ##
  # Destroys this record (remove from the database)
  # @promise
  destroy: ->
    @_runCallbacks 'destroy', 'before'
    try
      if @id
        await @constructor.delete id: @id
    finally
      @_runCallbacks 'destroy', 'after'

  ##
  # Deletes all records from the database
  # @promise
  @deleteAll: ->
    await @delete()

  ##
  # Adds a has-many association
  # @param {Class<Model>|String} target_model_or_column
  # @param {Object} [options]
  # @param {String} [options.type]
  # @param {String} [options.as]
  # @param {String} [options.foreign_key]
  # @param {String} [options.integrity='ignore'] 'ignore', 'nullify', 'restrict', or 'delete'
  @hasMany: (target_model_or_column, options) ->
    @_checkConnection()

    @_connection.addAssociation
      type: 'hasMany'
      this_model: @
      target_model_or_column: target_model_or_column
      options: options
    return

  ##
  # Adds a has-one association
  # @param {Class<Model>|String} target_model_or_column
  # @param {Object} [options]
  # @param {String} [options.type]
  # @param {String} [options.as]
  # @param {String} [options.foreign_key]
  # @param {String} [options.integrity='ignore'] 'ignore', 'nullify', 'restrict', or 'delete'
  @hasOne: (target_model_or_column, options) ->
    @_checkConnection()

    @_connection.addAssociation
      type: 'hasOne'
      this_model: @
      target_model_or_column: target_model_or_column
      options: options
    return

  ##
  # Adds a belongs-to association
  # @param {Class<Model>|String} target_model_or_column
  # @param {Object} [options]
  # @param {String} [options.type]
  # @param {String} [options.as]
  # @param {String} [options.foreign_key]
  # @param {Boolean} [options.required]
  @belongsTo: (target_model_or_column, options) ->
    @_checkConnection()

    @_connection.addAssociation
      type: 'belongsTo'
      this_model: @
      target_model_or_column: target_model_or_column
      options: options
    return

  @inspect: (depth) ->
    schema = Object.keys(@_schema or {}).sort().map((column) => return "#{column}: #{@_schema[column].type}").join(', ')
    return '\u001b[36m' + "[Model: #{@name}(" + '\u001b[90m' + schema + '\u001b[36m' + ")]" + '\u001b[39m'

ModelCacheMixin = require './cache'
ModelCallbackMixin = require './callback'
ModelPersistenceMixin = require './persistence'
ModelQueryMixin = require './query'
ModelTimestampMixin = require './timestamp'
ModelValidateMixin = require './validate'
class Model extends ModelCacheMixin(ModelCallbackMixin(ModelPersistenceMixin(ModelQueryMixin(ModelTimestampMixin(ModelValidateMixin(ModelBase))))))

module.exports = Model
