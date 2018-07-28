try
  redis = require 'redis'
catch error
  console.log 'Install redis module to use this adapter'
  process.exit 1

AdapterBase = require './base'
types = require '../types'
tableize = require('../util/inflector').tableize
_ = require 'lodash'
util = require 'util'

##
# Adapter for Redis
# @namespace adapter
class RedisAdapter extends AdapterBase
  support_upsert: false
  key_type: types.Integer

  _getKeys: (table, conditions) ->
    if Array.isArray conditions
      if conditions.length is 0
        return await @_client.keysAsync "#{table}:*"
      all_keys = []
      await Promise.all conditions.map (condition) =>
        keys = await @_getKeys table, condition
        [].push.apply all_keys, keys
        return
      return all_keys
    else if typeof conditions is 'object' and conditions.id
      if conditions.id.$in
        return conditions.id.$in.map (id) -> "#{table}:#{id}"
      else
        return ["#{table}:#{conditions.id}"]
    return []

  ##
  # Creates a Redis adapter
  constructor: (connection) ->
    super()
    @_connection = connection

  ## @override AdapterBase::drop
  drop: (model) ->
    @delete model, []

  valueToDB: (value, column, property) ->
    return if not value?
    switch property.type_class
      when types.Number, types.Integer
        value.toString()
      when types.Date
        new Date(value).getTime().toString()
      when types.Boolean
        if value then '1' else '0'
      when types.Object
        JSON.stringify value
      else
        value

  valueToModel: (value, property) ->
    switch property.type_class
      when types.Number, types.Integer
        Number value
      when types.Date
        new Date Number value
      when types.Boolean
        value isnt '0'
      when types.Object
        JSON.parse value
      else
        value

  ## @override AdapterBase::create
  create: (model, data) ->
    data.$_$ = '' # ensure that there is one argument(one field) at least
    try
      id = await @_client.incrAsync "#{tableize model}:_lastid"
    catch error
      throw RedisAdapter.wrapError 'unknown error', error
    try
      await @_client.hmsetAsync "#{tableize model}:#{id}", data
    catch error
      throw RedisAdapter.wrapError 'unknown error', error
    return id

  ## @override AdapterBase::createBulk
  createBulk: (model, data) ->
    await @_createBulkDefault model, data

  ## @override AdapterBase::update
  update: (model, data) ->
    key = "#{tableize model}:#{data.id}"
    delete data.id
    data.$_$ = '' # ensure that there is one argument(one field) at least
    try
      exists = await @_client.existsAsync key
    catch error
      throw RedisAdapter.wrapError 'unknown error', error
    if not exists
      return
    try
      await @_client.delAsync key
    catch error
      throw RedisAdapter.wrapError 'unknown error', error
    try
      await @_client.hmsetAsync key, data
    catch error
      throw RedisAdapter.wrapError 'unknown error', error
    return

  ## @override AdapterBase::updatePartial
  updatePartial: (model, data, conditions, options) ->
    fields_to_del = Object.keys(data).filter (key) -> not data[key]?
    fields_to_del.forEach (key) -> delete data[key]
    fields_to_del.push '$_$' # ensure that there is one argument at least
    table = tableize model
    data.$_$ = '' # ensure that there is one argument(one field) at least
    keys = await @_getKeys table, conditions
    for key in keys
      args = _.clone fields_to_del
      args.unshift key
      try
        await @_client.hdelAsync args
      catch error
        throw RedisAdapter.wrapError 'unknown error', error if error
      try
        await @_client.hmsetAsync key, data
      catch error
        throw RedisAdapter.wrapError 'unknown error', error if error
    return keys.length

  ## @override AdapterBase::findById
  findById: (model, id, options) ->
    try
      result = await @_client.hgetallAsync "#{tableize model}:#{id}"
    catch error
      throw RedisAdapter.wrapError 'unknown error', error
    if result
      result.id = id
      return @_convertToModelInstance model, result, options
    else
      throw new Error 'not found'

  ## @override AdapterBase::find
  find: (model, conditions, options) ->
    table = tableize model
    keys = await @_getKeys table, conditions
    records = await Promise.all keys.map (key) =>
      result = await @_client.hgetallAsync key
      if result
        result.id = Number key.substr table.length+1
      return result
    records = records.filter (record) -> record?
    return records.map (record) => @_convertToModelInstance model, record, options

  ## @override AdapterBase::delete
  delete: (model, conditions) ->
    keys = await @_getKeys tableize(model), conditions
    if keys.length is 0
      return 0
    try
      count = await @_client.delAsync keys
    catch error
      throw RedisAdapter.wrapError 'unknown error', error
    return count

  ##
  # Connects to the database
  # @param {Object} settings
  # @param {String} [settings.host='127.0.0.1']
  # @param {Number} [settings.port=6379]
  # @param {Number} [settings.database=0]
  connect: (settings) ->
    methods = ['del', 'exists', 'hdel', 'hgetall', 'hmset', 'incr', 'keys', 'select']
    @_client = redis.createClient settings.port or 6379, settings.host or '127.0.0.1'
    for method in methods
      @_client[method+'Async'] = util.promisify @_client[method]
    await @_client.selectAsync settings.database or 0

module.exports = (connection) ->
  new RedisAdapter connection
