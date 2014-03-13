{bindDomain} = require '../util'
Promise = require 'bluebird'
tableize = require('../inflector').tableize

##
# Model cache
# @namespace model
class ModelCache
  @_loadFromCache: (key, refresh) ->
    return Promise.reject new Error 'error' if refresh
    @_connection._connectRedisCache()
    .then (redis) =>
      key = 'CC.'+tableize(@_name)+':'+key
      Promise.promisify(redis.get, redis) key
    .then (data) ->
      return Promise.reject new Error 'error' if not data?
      Promise.resolve JSON.parse data

  @_saveToCache: (key, ttl, data) ->
    @_connection._connectRedisCache()
    .then (redis) =>
      key = 'CC.'+tableize(@_name)+':'+key
      Promise.promisify(redis.setex, redis) key, ttl, JSON.stringify(data)

  @removeCache: (key, callback) ->
    @_connection._connectRedisCache()
    .then (redis) =>
      key = 'CC.'+tableize(@_name)+':'+key
      Promise.promisify(redis.del, redis) key
      .catch (error) ->
    .nodeify bindDomain callback

module.exports = ModelCache
