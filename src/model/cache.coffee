Promise = require 'bluebird'
tableize = require('../util/inflector').tableize

##
# Model cache
# @namespace model
ModelCacheMixin = (Base) -> class extends Base
  @_loadFromCache: (key, refresh) ->
    if refresh
      throw new Error 'error'
    redis = await @_connection._connectRedisCache()
    key = 'CC.'+tableize(@_name)+':'+key
    value = await new Promise (resolve, reject) ->
      redis.get key, (error, value) ->
        return reject error if error
        resolve value
    if not value?
      throw new Error 'error'
    JSON.parse value

  @_saveToCache: (key, ttl, data) ->
    redis = await @_connection._connectRedisCache()
    key = 'CC.'+tableize(@_name)+':'+key
    await new Promise (resolve, reject) ->
      redis.setex key, ttl, JSON.stringify(data), (error) ->
        return reject error if error
        resolve()

  @removeCache: (key) ->
    redis = await @_connection._connectRedisCache()
    key = 'CC.'+tableize(@_name)+':'+key
    await new Promise (resolve, reject) ->
      redis.del key, (error, count) ->
        resolve()

module.exports = ModelCacheMixin
