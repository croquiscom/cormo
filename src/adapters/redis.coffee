try
  redis = require 'redis'
catch error
  console.log 'Install redis module to use this adapter'
  process.exit 1

AdapterBase = require './base'
types = require '../types'
tableize = require('../util/inflector').tableize
async = require 'async'
_ = require 'lodash'

##
# Adapter for Redis
# @namespace adapter
class RedisAdapter extends AdapterBase
  support_upsert: false
  key_type: types.Integer

  _getKeys: (table, conditions, callback) ->
    if Array.isArray conditions
      if conditions.length is 0
        @_client.keys "#{table}:*", (error, keys) ->
          callback null, keys
        return
      async.map conditions, (condition, callback) =>
        @_getKeys table, condition, callback
      , (error, keys) ->
        callback null, _.flatten keys
      return
    else if typeof conditions is 'object' and conditions.id
      if conditions.id.$in
        callback null, conditions.id.$in.map (id) -> "#{table}:#{id}"
      else
        callback null, ["#{table}:#{conditions.id}"]
      return
    return callback null, []

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
    new Promise (resolve, reject) =>
      data.$_$ = '' # ensure that there is one argument(one field) at least
      @_client.incr "#{tableize model}:_lastid", (error, id) =>
        if error
          reject RedisAdapter.wrapError 'unknown error', error
          return
        @_client.hmset "#{tableize model}:#{id}", data, (error) ->
          if error
            reject RedisAdapter.wrapError 'unknown error', error
          else
            resolve id

  ## @override AdapterBase::createBulk
  createBulk: (model, data) ->
    @_createBulkDefault model, data

  ## @override AdapterBase::update
  update: (model, data) ->
    new Promise (resolve, reject) =>
      key = "#{tableize model}:#{data.id}"
      delete data.id
      data.$_$ = '' # ensure that there is one argument(one field) at least
      @_client.exists key, (error, exists) =>
        if error
          reject RedisAdapter.wrapError 'unknown error', error
          return
        if not exists
          resolve()
          return
        @_client.del key, (error) =>
          if error
            reject RedisAdapter.wrapError 'unknown error', error
            return
          @_client.hmset key, data, (error) ->
            if error
              reject RedisAdapter.wrapError 'unknown error', error
              return
            resolve()

  ## @override AdapterBase::updatePartial
  updatePartial: (model, data, conditions, options) ->
    new Promise (resolve, reject) =>
      fields_to_del = Object.keys(data).filter (key) -> not data[key]?
      fields_to_del.forEach (key) -> delete data[key]
      fields_to_del.push '$_$' # ensure that there is one argument at least
      table = tableize model
      data.$_$ = '' # ensure that there is one argument(one field) at least
      @_getKeys table, conditions, (error, keys) =>
        async.forEach keys, (key, callback) =>
          args = _.clone fields_to_del
          args.unshift key
          @_client.hdel args, (error) =>
            return callback RedisAdapter.wrapError 'unknown error', error if error
            @_client.hmset key, data, (error) =>
              return callback RedisAdapter.wrapError 'unknown error', error if error
              callback null
        , (error) =>
          resolve keys.length

  ## @override AdapterBase::findById
  findById: (model, id, options) ->
    new Promise (resolve, reject) =>
      @_client.hgetall "#{tableize model}:#{id}", (error, result) =>
        if error
          reject RedisAdapter.wrapError 'unknown error', error
          return
        if result
          result.id = id
          resolve @_convertToModelInstance model, result, options
        else
          reject new Error 'not found'

  ## @override AdapterBase::find
  find: (model, conditions, options) ->
    new Promise (resolve, reject) =>
      table = tableize model
      @_getKeys table, conditions, (error, keys) =>
        async.map keys, (key, callback) =>
          @_client.hgetall key, (error, result) ->
            if result
              result.id = Number key.substr table.length+1
            callback null, result
        , (error, records) =>
          records = records.filter (record) -> record?
          resolve records.map (record) => @_convertToModelInstance model, record, options

  ## @override AdapterBase::delete
  delete: (model, conditions) ->
    new Promise (resolve, reject) =>
      @_getKeys tableize(model), conditions, (error, keys) =>
        if error
          reject error
          return
        if keys.length is 0
          resolve 0
          return
        @_client.del keys, (error, count) ->
          if error
            reject RedisAdapter.wrapError 'unknown error', error
            return
          resolve count

  ##
  # Connects to the database
  # @param {Object} settings
  # @param {String} [settings.host='127.0.0.1']
  # @param {Number} [settings.port=6379]
  # @param {Number} [settings.database=0]
  # @nodejscallback
  connect: (settings, callback) ->
    @_client = redis.createClient settings.port or 6379, settings.host or '127.0.0.1'
    @_client.on 'connect', =>
      @_client.select settings.database or 0, (error) ->
        callback error

module.exports = (connection) ->
  new RedisAdapter connection
