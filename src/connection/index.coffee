EventEmitter = require('events').EventEmitter
Model = require '../model'
_ = require 'lodash'
{bindDomain} = require '../util'
Promise = require 'bluebird'
Toposort = require 'toposort-class'
try
  redis = require 'redis'
{inspect} = require 'util'
try
  deasync = require 'deasync'

##
# Manages connection to a database
# @uses ConnectionAssociation
# @uses ConnectionManipulate
class Connection extends EventEmitter
  ##
  # Default connection
  # @property defaultConnection
  # @type Connection
  # @static
  # @see Connection::constructor

  ##
  # Indicates the adapter associated to this connection
  # @property _adapter
  # @type AdapterBase
  # @private
  # @see Connection::constructor

  ##
  # Model lists using this connection.
  # Maps from model name to model class
  # @property models
  # @type StringMap<Class<Model>>
  # @see Connection::constructor

  ##
  # Creates a connection
  # @param {String} adapater_name
  # @param {Object} settings connection settings & adapter specific settings
  # @param {Boolean} [settings.is_default=true] Connection.defaultConnection will be set to this if true
  # @param {Object} [settings.redis_cache] Redis server settings to cache
  # @param {RedisClient} [settings.redis_cache.client] Use this client instead of creating one
  # @param {String} [settings.redis_cache.host='127.0.0.1']
  # @param {Number} [settings.redis_cache.port=6379]
  # @param {Number} [settings.redis_cache.database=0]
  # @see MySQLAdapter::connect
  # @see MongoDBAdapter::connect
  # @see PostgreSQLAdapter::connect
  # @see SQLite3Adapter::connect
  # @see RedisAdapter::connect
  constructor: (adapter_name, settings) ->
    if settings.is_default isnt false
      Connection.defaultConnection = @

    redis_cache = settings.redis_cache or {}
    @_redis_cache_settings = redis_cache

    @connected = false
    @models = {}
    @_pending_associations = []
    @_schema_changed = false

    @_adapter = Promise.promisifyAll require(__dirname + '/../adapters/' + adapter_name) @
    @_promise_connection = @_adapter.connectAsync settings
    .then =>
      @connected = true
    .catch (error) =>
      @_adapter = null
      Promise.reject error

    Object.defineProperty @, 'adapter', get: -> @_adapter

  ##
  # Closes this connection.
  # A closed connection can be used no more.
  close: ->
    Connection.defaultConnection = null if Connection.defaultConnection is @
    @_adapter.close()
    @_adapter = null

  ##
  # Creates a model class
  # @param {String} name
  # @param {Object} schema
  # @return {Class<Model>}
  model: (name, schema) ->
    return Model.newModel @, name, schema

  _checkSchemaApplied: ->
    @_initializeModels()
    return Promise.resolve() if not @_applying_schemas and not @_schema_changed
    return @applySchemas()

  _initializeModels: ->
    for model, modelClass of @models
      if modelClass.initialize and not modelClass._initialize_called
        modelClass.initialize()
        modelClass._initializeModels = true
    return

  _checkArchive: ->
    for model, modelClass of @models
      if modelClass.archive and not modelClass._connection.models.hasOwnProperty '_Archive'
        class _Archive extends Model
          @connection modelClass._connection
          @archive: false
          @column 'model', String
          @column 'data', Object
    return

  _getModelNamesByAssociationOrder: ->
    t = new Toposort()
    Object.keys(@models).forEach (model) =>
      t.add model, []
      modelClass = @models[model]
      for name, association of modelClass._associations
        # ignore association with models of other connection
        if association.target_model._connection isnt @
          continue
        # ignore self association
        if association.target_model is modelClass
          continue
        if association.type in ['hasMany', 'hasOne']
          t.add association.target_model._name, model
        else if association.type is 'belongsTo'
          t.add model, association.target_model._name
    t.sort()

  ##
  # Applies schemas
  # @promise
  # @nodejscallback
  # @see AdapterBase::applySchema
  applySchemas: (callback) ->
    Promise.resolve().then =>
      @_initializeModels()
      return if not @_schema_changed

      @_applyAssociations()

      if not @_applying_schemas
        @_applying_schemas = true

        @_checkArchive()

        @_promise_schema_applied = @_promise_connection.then =>
          return @_adapter.getSchemasAsync()
          .tap (current) =>
            tables_commands = []
            for model, modelClass of @models
              if not current.tables[modelClass.tableName]
                tables_commands.push @_adapter.createTableAsync model
            Promise.all tables_commands
          .tap (current) =>
            indexes_commands = []
            for model, modelClass of @models
              for index in modelClass._indexes
                indexes_commands.push @_adapter.createIndexAsync model, index
            Promise.all indexes_commands
          .finally =>
            @_applying_schemas = false
            @_schema_changed = false
      return @_promise_schema_applied
    .nodeify bindDomain callback

  ##
  # Applies schemas synchronously
  # @method
  # @see Connection::applySchemas
  applySchemasSync: deasync? @::applySchemas

  ##
  # Drops all model tables
  # @promise
  # @nodejscallback
  dropAllModels: (callback) ->
    current = Promise.resolve()
    Promise.all @_getModelNamesByAssociationOrder().map (model) =>
      current = current
      .then =>
        @models[model].drop()
    .nodeify bindDomain callback

  ##
  # Logs
  # @param {String} model
  # @param {String} type
  # @param {Object} data
  log: (model, type, data) ->

  _connectRedisCache: ->
    if @_redis_cache_client
      Promise.resolve @_redis_cache_client
    else if not redis
      Promise.reject new Error('cache needs Redis')
    else
      settings = @_redis_cache_settings
      @_redis_cache_client = client = settings.client or (redis.createClient settings.port or 6379, settings.host or '127.0.0.1')
      if settings.database?
        client.select settings.database
        client.once 'connect', ->
          client.send_anyways = true
          client.select settings.database
          client.send_anyways = false
      Promise.resolve client

  inspect: (depth) ->
    inspect @models

_use = (file) ->
  MixClass = require "./#{file}"
  _.extend Connection, MixClass
  _.extend Connection::, MixClass::
_use 'association'
_use 'manipulate'

Model._Connection = Connection

module.exports = Connection
