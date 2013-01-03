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

_convertValueToObjectID = (value, key) ->
  try
    new ObjectID value
  catch e
    throw new Error("'#{key}' is not a valid id")

_buildWhereSingle = (property, key, value, not_op) ->
  if key isnt 'id' and not property?
    throw new Error("unknown column '#{key}'")
  property_type = property?.type
  is_objectid = key is 'id' or property_type is 'objectid'
  if Array.isArray value
    if is_objectid
      value = value.map (v) -> _convertValueToObjectID v, key
    if not_op
      value = $nin: value
    else
      value = $in: value
  else if typeof value is 'object' and (keys = Object.keys value).length is 1
    sub_key = keys[0]
    switch sub_key
      when '$not'
        return _buildWhereSingle property, key, value[sub_key], not not_op
      when '$gt', '$lt', '$gte', '$lte'
        sub_value = value[sub_key]
        sub_value = new Date sub_value if property_type is types.Date
        value = {}
        value[sub_key] = sub_value
        if not_op
          value = $not: value
        obj = {}
        obj[key] = value
        return obj
      when '$contains'
        value = new RegExp value[sub_key], 'i'
      when '$in'
        if is_objectid
          value[sub_key] = value[sub_key].map (v) -> _convertValueToObjectID v, key
      else
        throw new Error "unknown operator '#{sub_key}'"
    if not_op
      value = $not: value
  else
    if is_objectid
      value = _convertValueToObjectID value, key
    if not_op
      value = $ne: value

  obj = {}
  key = '_id' if key is 'id'
  value = new Date value if property_type is types.Date
  obj[key] = value
  return obj

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
        return _buildWhereSingle schema[key], key, conditions[key]
    else
      subs = keys.map (key) -> _buildWhereSingle schema[key], key, conditions[key]
  else
    throw new Error "'#{JSON.stringify conditions}' is not an object"

  if subs.length is 0
    return
  else if subs.length is 1
    return subs[0]
  else
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

  ## @override AdapterBase::applySchema
  applySchema: (model, callback) ->
    collection = @_collection(model)
    indexes = []
    for column, property of @_connection.models[model]._schema
      if property.unique
        if property.required
          indexes.push [ column, { unique: true } ]
        else
          indexes.push [ column, { unique: true, sparse: true } ]
      if property.type is types.GeoPoint
        obj = {}
        obj[column] = '2d'
        indexes.push [ obj ]
    for index in @_connection.models[model]._indexes
      if index.options.unique
        indexes.push [ index.columns, { name: index.options.name, unique: true, sparse: true } ]
      else
        indexes.push [ index.columns, { name: index.options.name } ]
    async.forEach indexes, (index, callback) ->
        collection.ensureIndex index[0], index[1], (error) ->
          callback error
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
      throw new Error("'id' is not a valid ID")

  valueToDB: (value, column, property) ->
    return if not value?
    # convert id type
    if column is 'id' or property.type is 'objectid'
      try
        return new ObjectID value
      catch e
        throw new Error("'#{column}' is not a valid ID")
    return value

  _getModelID: (data) ->
    data._id.toString()

  valueToModel: (value, column, property) ->
    if property.type is 'objectid'
      value.toString()
    else
      value

  ## @override AdapterBase::create
  create: (model, data, callback) ->
    @_collection(model).insert data, safe: true, (error, result) ->
      if error?.code is 11000
        column = ''
        key = error.err.match /index: [\w-.]+\$(\w+)/
        if key?
          column = key[1]
          key = column.match /(\w+)_1/
          if key?
            column = key[1]
          column = ' ' + column
        return callback new Error('duplicated' + column)
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      id = result?[0]?._id.toString()
      if id
        delete data._id
        callback null, id
      else
        callback new Error 'unexpected result'

  ## @override AdapterBase::create
  createBulk: (model, data, callback) ->
    @_collection(model).insert data, safe: true, (error, result) ->
      if error?.code is 11000
        key = error.err.match /index: [\w-.]+\$(\w+)_1/
        return callback new Error('duplicated ' + key?[1])
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      error = undefined
      ids = result.map (doc) ->
        id = doc._id.toString()
        if id
          delete data._id
        else
          error = new Error 'unexpected result'
        return id
      return callback error if error
      callback null, ids

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

  _buildUpdateOps: (schema, update_ops, data, path, object) ->
    for column, value of object
      property = schema[path+column]
      if property
        if value?
          update_ops.$set[path+column] = value
        else
          update_ops.$unset[path+column] = ''
      else if typeof object[column] is 'object'
        @_buildUpdateOps schema, update_ops, data, path + column + '.', object[column]

  ## @override AdapterBase::updatePartial
  updatePartial: (model, data, conditions, options, callback) ->
    schema = @_connection.models[model]._schema
    try
      conditions = _buildWhere schema, conditions
    catch e
      return callback e
    if not conditions
      conditions = {}
    update_ops = $set: {}, $unset: {}
    @_buildUpdateOps schema, update_ops, data, '', data
    @_collection(model).update conditions, update_ops, safe: true, multi: true, (error, count) ->
      if error?.code is 11001
        key = error.err.match /index: [\w-.]+\$(\w+)_1/
        return callback new Error('duplicated ' + key?[1])
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      callback null, count

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
    if options.orders.length > 0
      orders = {}
      options.orders.forEach (order) ->
        if order[0] is '-'
          orders[order[1..]] = -1
        else
          orders[order] = 1
    #console.log JSON.stringify conditions
    options =
      limit: options.limit
    if fields
      options.fields = fields
    if orders
      options.sort = orders
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
  # @param {String} [settings.user]
  # @param {String} [settings.password]
  # @param {String} settings.database
  # @param {Function} callback
  # @param {Error} callback.error
  connect: (settings, callback) ->
    server = new mongodb.Server settings.host or 'localhost', settings.port or 27017, {}
    db = new mongodb.Db settings.database, server, safe: true
    db.open (error, client) =>
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      if settings.user or settings.password
        db.authenticate settings.user, settings.password, (error, success) =>
          if success
            @_client = client
            callback null
          else
            callback MongoDBAdapter.wrapError 'unknown error', error
      else
        @_client = client
        callback null

module.exports = (connection) ->
  new MongoDBAdapter connection
