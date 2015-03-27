try
  mongodb = require 'mongodb'
catch error
  console.log 'Install mongodb module to use this adapter'
  process.exit 1

ObjectID = mongodb.ObjectID

_ = require 'underscore'
AdapterBase = require './base'
async = require 'async'
types = require '../types'

_convertValueToObjectID = (value, key) ->
  try
    new ObjectID value
  catch e
    throw new Error("'#{key}' is not a valid id")

_objectIdToString = (oid) ->
  oid = oid.id
  str = ''
  value = oid.charCodeAt 0
  str += '0' if value < 16
  str += value.toString(16)
  value = oid.charCodeAt 1
  str += '0' if value < 16
  str += value.toString(16)
  value = oid.charCodeAt 2
  str += '0' if value < 16
  str += value.toString(16)
  value = oid.charCodeAt 3
  str += '0' if value < 16
  str += value.toString(16)
  value = oid.charCodeAt 4
  str += '0' if value < 16
  str += value.toString(16)
  value = oid.charCodeAt 5
  str += '0' if value < 16
  str += value.toString(16)
  value = oid.charCodeAt 6
  str += '0' if value < 16
  str += value.toString(16)
  value = oid.charCodeAt 7
  str += '0' if value < 16
  str += value.toString(16)
  value = oid.charCodeAt 8
  str += '0' if value < 16
  str += value.toString(16)
  value = oid.charCodeAt 9
  str += '0' if value < 16
  str += value.toString(16)
  value = oid.charCodeAt 10
  str += '0' if value < 16
  str += value.toString(16)
  value = oid.charCodeAt 11
  str += '0' if value < 16
  str += value.toString(16)
  return str

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
  else if typeof value is 'object' and value isnt null and (keys = Object.keys value).length is 1
    sub_key = keys[0]
    switch sub_key
      when '$not'
        return _buildWhereSingle property, key, value[sub_key], not not_op
      when '$gt', '$lt', '$gte', '$lte'
        sub_value = value[sub_key]
        if is_objectid
          sub_value = _convertValueToObjectID sub_value, key
        else if property_type is types.Date
          sub_value = new Date sub_value
        value = {}
        value[sub_key] = sub_value
        if not_op
          value = $not: value
        obj = {}
        key = '_id' if key is 'id'
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
    if is_objectid and value?
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
    if conjunction is '$and'
      before_count = _.reduce subs, ( (memo, sub) -> memo + Object.keys(sub).length ), 0
      subs.unshift {}
      obj = _.extend.apply _, subs
      subs.shift()
      keys = Object.keys obj
      after_count = keys.length
      if before_count is after_count and not _.some(keys, (key) -> key.substr(0, 1) is '$')
        return obj
    obj = {}
    obj[conjunction] = subs
    return obj

_buildGroupFields = (group_by, group_fields) ->
  group = {}
  if group_by
    if group_by.length is 1
      group._id = '$' + group_by[0]
    else
      group._id = {}
      group_by.forEach (field) -> group._id[field] = '$' + field
  else
    group._id = null
  for field, expr of group_fields
    group[field] = expr
  return group

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

  _getMongoDBColName = (name) ->
    # there is a problem with name begins with underscore
    if name is '_archives'
      '@archives'
    else
      name

  _collection: (model) ->
    name = @_connection.models[model].tableName
    if not @_collections[name]
      return @_collections[name] = @_client.collection _getMongoDBColName name
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
    name = @_connection.models[model].tableName
    delete @_collections[name]
    @_client.dropCollection _getMongoDBColName(name), (error) ->
      # ignore not found error
      if error and error.errmsg isnt 'ns not found'
        return callback MongoDBAdapter.wrapError 'unknown error', error
      callback null

  idToDB: (value) ->
    _convertValueToObjectID value, 'id'

  valueToDB: (value, column, property) ->
    return if not value?
    # convert id type
    if column is 'id' or property.type is 'objectid'
      if property.array
        return value.map (v) -> v and _convertValueToObjectID v, column
      else
        return _convertValueToObjectID value, column
    return value

  _getModelID: (data) ->
    _objectIdToString data._id

  valueToModel: (value, property) ->
    if property.type is 'objectid'
      if property.array
        value.map (v) -> v and _objectIdToString v
      else
        value and _objectIdToString value
    else
      value

  ## @override AdapterBase::create
  create: (model, data, callback) ->
    @_collection(model).insert data, safe: true, (error, result) ->
      if error?.code is 11000
        column = ''
        key = error.message.match /index: [\w-.]+\$(\w+)/
        if key?
          column = key[1]
          key = column.match /(\w+)_1/
          if key?
            column = key[1]
          column = ' ' + column
        return callback new Error('duplicated' + column)
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      id = _objectIdToString result.ops[0]._id
      if id
        delete data._id
        callback null, id
      else
        callback new Error 'unexpected result'

  ## @override AdapterBase::create
  createBulk: (model, data, callback) ->
    @_collection(model).insert data, safe: true, (error, result) ->
      if error?.code is 11000
        key = error.message.match /index: [\w-.]+\$(\w+)_1/
        return callback new Error('duplicated ' + key?[1])
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      error = undefined
      ids = result.ops.map (doc) ->
        id = _objectIdToString doc._id
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
        key = error.message.match /index: [\w-.]+\$(\w+)_1/
        return callback new Error('duplicated ' + key?[1])
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      callback null

  _buildUpdateOps: (schema, update_ops, data, path, object) ->
    for column, value of object
      property = schema[path+column]
      if property
        if value?
          if value.$inc
            update_ops.$inc[path+column] = value.$inc
          else
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
    update_ops = $set: {}, $unset: {}, $inc: {}
    @_buildUpdateOps schema, update_ops, data, '', data
    if Object.keys(update_ops.$set).length is 0
      delete update_ops.$set
    if Object.keys(update_ops.$unset).length is 0
      delete update_ops.$unset
    if Object.keys(update_ops.$inc).length is 0
      delete update_ops.$inc
    @_collection(model).update conditions, update_ops, safe: true, multi: true, (error, result) ->
      if error?.code is 11001
        key = error.message.match /index: [\w-.]+\$(\w+)_1/
        return callback new Error('duplicated ' + key?[1])
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      callback null, result.result.n

  ## @override AdapterBase::findById
  findById: (model, id, options, callback) ->
    if options.select
      fields = {}
      options.select.forEach (column) -> fields[column] = 1
    try
      id = _convertValueToObjectID id, 'id'
    catch e
      return callback new Error('not found')
    client_options = {}
    if fields
      client_options.fields = fields
    if options.explain
      client_options.explain = true
      return @_collection(model).findOne _id: id, client_options, (error, result) ->
        return callback error if error
        callback null, result
    @_collection(model).findOne _id: id, client_options, (error, result) =>
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      return callback new Error('not found') if not result
      if options.lean
        callback null, @_refineRawInstance model, result, options.select, options.select_raw
      else
        callback null, @_convertToModelInstance model, result, options.select, options.select_raw

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
      # MongoDB fails if $near is mixed with $and
      keys = Object.keys conditions if conditions
      if keys and (keys.length > 1 or keys[0].substr(0, 1) isnt '$')
        conditions[field] = { $near: options.near[field] }
      else
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
          column = order[1..]
          dir = -1
        else
          column = order
          dir = 1
        if options.group_by
          if options.group_by.length is 1
            column = '_id' if column is options.group_by[0]
          else
            column = '_id.'+column if options.group_by.indexOf(column)>=0
        else
          if column is 'id'
            column = '_id'
        orders[column] = dir
    #console.log JSON.stringify conditions
    if options.group_by or options.group_fields
      pipeline = []
      if conditions
        pipeline.push $match: conditions
      pipeline.push $group: _buildGroupFields options.group_by, options.group_fields
      pipeline.push $sort: orders if orders
      if options.conditions_of_group.length > 0
        pipeline.push $match: _buildWhere options.group_fields, options.conditions_of_group
      if options.explain
        return @_collection(model).aggregate pipeline, explain: true, (error, result) ->
          return callback error if error
          callback null, result
      @_collection(model).aggregate pipeline, (error, result) =>
        return callback MongoDBAdapter.wrapError 'unknown error', error if error
        callback null, result.map (record) =>
          if options.group_by
            if options.group_by.length is 1
              record[options.group_by[0]] = record._id
            else
              record[group] = record._id[group] for group in options.group_by
          @_convertToGroupInstance model, record, options.group_by, options.group_fields
    else
      client_options =
        limit: options.limit
        skip: options.skip
      if fields
        client_options.fields = fields
      if orders
        client_options.sort = orders
      if options.explain
        client_options.explain = true
        return @_collection(model).find conditions, client_options, (error, cursor) ->
          return callback error if error
          cursor.toArray (error, result) ->
            return callback error if error
            callback null, result
      @_collection(model).find conditions, client_options, (error, cursor) =>
        return callback MongoDBAdapter.wrapError 'unknown error', error if error or not cursor
        cursor.toArray (error, result) =>
          return callback MongoDBAdapter.wrapError 'unknown error', error if error
          if options.lean
            callback null, result.map (record) => @_refineRawInstance model, record, options.select, options.select_raw
          else
            callback null, result.map (record) => @_convertToModelInstance model, record, options.select, options.select_raw

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
    model_class = @_connection.models[model]
    try
      conditions = _buildWhere model_class._schema, conditions
    catch e
      return callback e
    #console.log JSON.stringify conditions
    @_collection(model).remove conditions, safe: true, (error, result) ->
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      callback null, result.result.n

  ##
  # Connects to the database
  # @param {Object} settings
  # @param {String} [settings.host='localhost']
  # @param {Number} [settings.port=27017]
  # @param {String} [settings.user]
  # @param {String} [settings.password]
  # @param {String} settings.database
  # @nodejscallback
  connect: (settings, callback) ->
    if settings.user or settings.password
      url = "mongodb://#{settings.user}:#{settings.password}@#{settings.host or 'localhost'}:#{settings.port or 27017}/#{settings.database}"
    else
      url = "mongodb://#{settings.host or 'localhost'}:#{settings.port or 27017}/#{settings.database}"
    mongodb.MongoClient.connect url, (error, db) =>
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      @_client = db
      callback null

  ## @override AdapterBase::close
  close: ->
    if @_client
      @_client.close()
    @_client = null

module.exports = (connection) ->
  new MongoDBAdapter connection
