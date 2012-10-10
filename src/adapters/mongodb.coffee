try
  mongodb = require 'mongodb'
catch error
  console.log 'Install mongodb module to use this adapter'
  process.exit 1

ObjectID = mongodb.ObjectID

AdapterBase = require './base'
types = require '../types'
tableize = require('../inflector').tableize
async = require 'async'

_buildWhere = (conditions, conjunction='$and') ->
  if Array.isArray conditions
    subs = conditions.map (condition) -> _buildWhere condition
  else if typeof conditions is 'object'
    keys = Object.keys conditions
    if keys.length is 0
      return
    else if keys.length is 1
      key = keys[0]
      if key.substr(0, 1) is '$'
        switch key
          when '$and'
            return _buildWhere conditions[key], '$and'
          when '$or'
            return _buildWhere conditions[key], '$or'
        return
      else
        value = conditions[key]
        if typeof value is 'object' and (keys = Object.keys value).length is 1
          sub_key = keys[0]
          switch sub_key
            when '$gt' or '$lt' or '$gte' or '$lte'
              obj = {}
              obj[key] = {}
              obj[key][sub_key] = value[sub_key]
              return obj
            when '$include'
              value = new RegExp value[sub_key], 'i'
        obj = {}
        if key is 'id'
          try
            obj._id = new ObjectID value
          catch e
            throw new Error('unknown error')
        else
          obj[key] = value
        return obj
    else
      subs = keys.map (key) ->
        obj = {}
        obj[key] = conditions[key]
        _buildWhere obj
  else
    return
  return if subs.length is 0
  return subs[0] if subs.length is 1
  obj = {}
  obj[conjunction] = subs
  return obj

###
# Adapter for MongoDB
###
class MongoDBAdapter extends AdapterBase
  support_geopoint: true
  key_type: types.String

  ###
  # Creates a MongoDB adapter
  ###
  constructor: (connection) ->
    @_connection = connection
    @_collections = {}

  _collection: (name) ->
    name = tableize name
    if not @_collections[name]
      return @_collections[name] = new mongodb.Collection @_client, name
    else
      return @_collections[name]

  _applySchema: (model, callback) ->
    collection = @_collection(model)
    indexes = []
    for column, property of @_connection.models[model]._schema
      if property.unique
        indexes.push [ column, { safe: true, unique: true, sparse: true } ]
      if property.type is types.GeoPoint
        obj = {}
        obj[column] = '2d'
        indexes.push [ obj ]
    async.forEach indexes, (index, callback) ->
        collection.ensureIndex index[0], index[1], (error) ->
          callback error
      , (error) ->
        callback error

  ###
  # Ensures indexes
  # @param {Function} callback
  # @param {Error} callback.error
  # @see DBConnection.applySchemas
  ###
  applySchemas: (callback) ->
    async.forEach Object.keys(@_connection.models), (model, callback) =>
        @_applySchema model, callback
      , (error) ->
        callback error

  ###
  # Drops a model from the database
  # @param {String} model
  # @param {Function} callback
  # @param {Error} callback.error
  # @see DBModel.drop
  ###
  drop: (model, callback) ->
    name = tableize model
    delete @_collections[name]
    @_client.dropCollection name, (error) ->
      # ignore not found error
      if error and error.errmsg isnt 'ns not found'
        return callback MongoDBAdapter.wrapError 'unknown error', error
      callback null

  ###
  # Creates a record
  # @param {String} model
  # @param {Object} data
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {String} callback.id
  ###
  create: (model, data, callback) ->
    # remove null field before save
    Object.keys(data).forEach (field) ->
      delete data[field] if not data[field]?

    @_collection(model).insert data, safe: true, (error, result) ->
      if error?.code is 11000
        key = error.err.match /index: [\w-.]+\$(\w+)_1/
        return callback new Error('duplicated ' + key?[1])
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      id = result?[0]?._id.toString()
      if id
        delete data._id
        callback null, id
      else
        callback new Error 'unexpected result'

  ###
  # Updates a record
  # @param {String} model
  # @param {Object} data
  # @param {Function} callback
  # @param {Error} callback.error
  ###
  update: (model, data, callback) ->
    try
      id = new ObjectID data.id
    catch e
      return callback new Error('unknown error')

    # remove null field before save
    Object.keys(data).forEach (field) ->
      delete data[field] if not data[field]?

    @_collection(model).update { _id: id }, data, safe: true, (error) ->
      if error?.code is 11001
        key = error.err.match /index: [\w-.]+\$(\w+)_1/
        return callback new Error('duplicated ' + key?[1])
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      callback null

  _convertToModelInstance: (model, data) ->
    modelClass = @_connection.models[model]
    record = new modelClass()
    Object.defineProperty record, 'id', configurable: false, enumerable: true, writable: false, value: data._id.toString()
    for column of modelClass._schema
      record[column] = data[column]
    return record

  ###
  # Finds a record by id
  # @param {String} model
  # @param {String} id
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {DBModel} callback.record
  # @throws Error('not found')
  ###
  findById: (model, id, callback) ->
    try
      id = new ObjectID id
    catch e
      return callback new Error('not found')
    @_collection(model).findOne _id: id, (error, result) =>
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      return callback new Error('not found') if not result
      callback null, @_convertToModelInstance model, result

  ###
  # Finds records
  # @param {String} model
  # @param {Object} conditions
  # @param {Object} options
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Array<DBModel>} callback.records
  ###
  find: (model, conditions, options, callback) ->
    try
      conditions = _buildWhere conditions
    catch e
      return callback e
    if options.near? and field = Object.keys(options.near)[0]
      obj = {}
      obj[field] = { $near: options.near[field] }
      if conditions
        conditions = { $and : [  conditions, obj ] }
      else
        conditions = obj
    #console.log JSON.stringify conditions
    options =
      limit: options.limit
    @_collection(model).find conditions, options, (error, cursor) =>
      return callback MongoDBAdapter.wrapError 'unknown error', error if error or not cursor
      cursor.toArray (error, result) =>
        return callback MongoDBAdapter.wrapError 'unknown error', error if error or not cursor
        callback null, result.map (record) => @_convertToModelInstance model, record

  ###
  # Counts records
  # @param {String} model
  # @param {Object} conditions
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Number} callback.count
  ###
  count: (model, conditions, callback) ->
    try
      conditions = _buildWhere conditions
    catch e
      return callback e
    #console.log JSON.stringify conditions
    @_collection(model).count conditions, (error, count) =>
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      callback null, count

  ###
  # Deletes records from the database
  # @param {String} model
  # @param {Object} conditions
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Number} callback.count
  ###
  delete: (model, conditions, callback) ->
    try
      conditions = _buildWhere conditions
    catch e
      return callback e
    #console.log JSON.stringify conditions
    @_collection(model).remove conditions, safe: true, (error, count) ->
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      callback null, count

  ###
  # Connects to the database
  # @param {Object} settings
  # @param {String} [settings.host='localhost']
  # @param {Number} [settings.port=27017]
  # @param {String} settings.database
  # @param {Function} callback
  # @param {Error} callback.error
  ###
  connect: (settings, callback) ->
    server = new mongodb.Server settings.host or 'localhost', settings.port or 27017, {}
    db = new mongodb.Db settings.database, server, {}
    db.open (error, client) =>
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      @_client = client
      callback null

module.exports = (connection) ->
  new MongoDBAdapter connection
