{bindDomain} = require '../util'
Promise = require 'bluebird'
tableize = require('../util/inflector').tableize

##
# Model cache
# @namespace model
class ModelCache
  @_loadFromCache: (key, refresh) ->
    return Promise.reject new Error 'error' if refresh
    @_connection._connectRedisCache()
    .then (redis) =>
      key = 'CC.'+tableize(@_name)+':'+key
      new Promise (resolve, reject) ->
        redis.get key, (error, value) ->
          return reject error if error
          resolve value
    .then (value) ->
      return Promise.reject new Error 'error' if not value?
      Promise.resolve JSON.parse value

  @_saveToCache: (key, ttl, data) ->
    @_connection._connectRedisCache()
    .then (redis) =>
      key = 'CC.'+tableize(@_name)+':'+key
      new Promise (resolve, reject) ->
        redis.setex key, ttl, JSON.stringify(data), (error) ->
          return reject error if error
          resolve()

  @removeCache: (key, callback) ->
    @_connection._connectRedisCache()
    .then (redis) =>
      key = 'CC.'+tableize(@_name)+':'+key
      new Promise (resolve, reject) ->
        redis.del key, (error, count) ->
          resolve()
    .nodeify bindDomain callback

module.exports = ModelCache
