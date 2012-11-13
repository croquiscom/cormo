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

_buildWhere = (schema, conditions, conjunction='$and') ->
  if Array.isArray conditions
    subs = conditions.map (condition) -> _buildWhere schema, condition
  else if typeof conditions is 'object'
    keys = Object.keys conditions
    if keys.length is 0
      return
    else if keys.length is 1
      key = keys[0]
      if key.substr(0, 1) is '$'
        switch key
          when '$and'
            return _buildWhere schema, conditions[key], '$and'
          when '$or'
            return _buildWhere schema, conditions[key], '$or'
        return
      else
        is_objectid = key is 'id' or schema[key].type is 'objectid'
        value = conditions[key]
        if Array.isArray value
          if is_objectid
            try
              value = value.map (v) -> new ObjectID v
            catch e
              throw new Error("'#{key}' is not a valid id")
          value = $in: value
        else if typeof value is 'object' and (keys = Object.keys value).length is 1
          sub_key = keys[0]
          switch sub_key
            when '$gt' or '$lt' or '$gte' or '$lte'
              obj = {}
              obj[key] = {}
              obj[key][sub_key] = value[sub_key]
              return obj
            when '$contains'
              value = new RegExp value[sub_key], 'i'
            when '$in'
              if is_objectid
                try
                  value[sub_key] = value[sub_key].map (v) -> new ObjectID v
                catch e
                  throw new Error("'#{key}' is not a valid id")
        else if is_objectid
          try
            value = new ObjectID value
          catch e
            throw new Error("'#{key}' is not a valid id")
        if key is 'id'
          key = '_id'
        obj = {}
        obj[key] = value
        return obj
    else
      subs = keys.map (key) ->
        obj = {}
        obj[key] = conditions[key]
        _buildWhere schema, obj
  else
    return
  return if subs.length is 0
  return subs[0] if subs.length is 1
  obj = {}
  obj[conjunction] = subs
  return obj

##
# Adapter for MongoDB
# @namespace adapter
class MongoDBAdapter extends AdapterBase
  key_type: types.String
  key_type_internal: 'objectid'
  support_geopoint: true
  support_nested: true

  ##
  # Creates a MongoDB adapter
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

  ## @override AdapterBase::applySchemas
  applySchemas: (callback) ->
    async.forEach Object.keys(@_connection.models), (model, callback) =>
        @_applySchema model, callback
      , (error) ->
        callback error

  ## @override AdapterBase::drop
  drop: (model, callback) ->
    name = tableize model
    delete @_collections[name]
    @_client.dropCollection name, (error) ->
      # ignore not found error
      if error and error.errmsg isnt 'ns not found'
        return callback MongoDBAdapter.wrapError 'unknown error', error
      callback null

  idToDB: (value) ->
    try
      return new ObjectID value
    catch e
      callback new Error("'id' is not a valid ID")

  valueToDB: (value, column, property) ->
    return if not value?
    # convert id type
    if column is 'id' or property.type is 'objectid'
      try
        return new ObjectID value
      catch e
        callback new Error("'#{column}' is not a valid ID")
    return value

  _getModelID: (data) ->
    data._id.toString()

  valueToModel: (value, column, property) ->
    if value?
      if property.type is 'objectid'
        return value.toString()
    return value

  ## @override AdapterBase::create
  create: (model, data, callback) ->
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

  ## @override AdapterBase::update
  update: (model, data, callback) ->
    id = data.id
    delete data.id
    @_collection(model).update { _id: id }, data, safe: true, (error) ->
      if error?.code is 11001
        key = error.err.match /index: [\w-.]+\$(\w+)_1/
        return callback new Error('duplicated ' + key?[1])
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      callback null

  ## @override AdapterBase::findById
  findById: (model, id, options, callback) ->
    if options.select
      fields = {}
      options.select.forEach (column) -> fields[column] = 1
    try
      id = new ObjectID id
    catch e
      return callback new Error('not found')
    options = {}
    if fields
      options.fields = fields
    @_collection(model).findOne _id: id, options, (error, result) =>
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      return callback new Error('not found') if not result
      callback null, @_convertToModelInstance model, result

  ## @override AdapterBase::find
  find: (model, conditions, options, callback) ->
    if options.select
      fields = {}
      options.select.forEach (column) -> fields[column] = 1
    try
      conditions = _buildWhere @_connection.models[model]._schema, conditions
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
    if fields
      options.fields = fields
    @_collection(model).find conditions, options, (error, cursor) =>
      return callback MongoDBAdapter.wrapError 'unknown error', error if error or not cursor
      cursor.toArray (error, result) =>
        return callback MongoDBAdapter.wrapError 'unknown error', error if error or not cursor
        callback null, result.map (record) => @_convertToModelInstance model, record

  ## @override AdapterBase::count
  count: (model, conditions, callback) ->
    try
      conditions = _buildWhere @_connection.models[model]._schema, conditions
    catch e
      return callback e
    #console.log JSON.stringify conditions
    @_collection(model).count conditions, (error, count) =>
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      callback null, count

  ## @override AdapterBase::delete
  delete: (model, conditions, callback) ->
    try
      conditions = _buildWhere @_connection.models[model]._schema, conditions
    catch e
      return callback e
    #console.log JSON.stringify conditions
    @_collection(model).remove conditions, safe: true, (error, count) ->
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      callback null, count

  ##
  # Connects to the database
  # @param {Object} settings
  # @param {String} [settings.host='localhost']
  # @param {Number} [settings.port=27017]
  # @param {String} settings.database
  # @param {Function} callback
  # @param {Error} callback.error
  connect: (settings, callback) ->
    server = new mongodb.Server settings.host or 'localhost', settings.port or 27017, {}
    db = new mongodb.Db settings.database, server, safe: true
    db.open (error, client) =>
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      @_client = client
      callback null

module.exports = (connection) ->
  new MongoDBAdapter connection
