tableize = require('../inflector').tableize

##
# Model cache
# @namespace model
class ModelCache
  @_loadFromCache: (key, refresh, callback) ->
    return callback 'error' if refresh
    @_connection._connectRedisCache (error, redis) =>
      return callback error if error
      key = 'CC.'+tableize(@_name)+':'+key
      redis.get key, (error, data) ->
        return callback 'error' if error or not data?
        callback null, JSON.parse data

  @_saveToCache: (key, ttl, data, callback) ->
    @_connection._connectRedisCache (error, redis) =>
      return callback error if error
      key = 'CC.'+tableize(@_name)+':'+key
      redis.setex key, ttl, JSON.stringify(data), (error) ->
        callback error

  @removeCache: (key, callback) ->
    @_connection._connectRedisCache (error, redis) =>
      return callback error if error
      key = 'CC.'+tableize(@_name)+':'+key
      redis.del key, (error) ->
        callback null

module.exports = ModelCache
