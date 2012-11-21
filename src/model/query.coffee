Query = require '../query'

##
# Model query
# @namespace model
class ModelQuery
  ##
  # Finds a record by id
  # @param {RecordID|Array<RecordID>} id
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Model|Array<Model>} callback.record
  # @return {Query}
  # @throws Error('not found')
  @find: (id, callback) ->
    return if @_waitingForConnection @, @find, arguments

    query = new Query @
    query.find id
    if typeof callback is 'function'
      query.exec callback
    return query

  ##
  # Finds records by conditions
  # @param {Object} [condition]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Array<Model>} callback.records
  # @return {Query}
  @where: (condition, callback) ->
    return if @_waitingForConnection @, @where, arguments

    if typeof condition is 'function'
      callback = condition
      condition = null
    query = new Query @
    query.where condition
    if typeof callback is 'function'
      query.exec callback
    return query

  ##
  # Selects columns for result
  # @param {String} [columns]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Array<Model>} callback.records
  # @return {Query}
  @select: (columns, callback) ->
    return if @_waitingForConnection @, @select, arguments

    if typeof columns is 'function'
      callback = columns
      columns = null
    query = new Query @
    query.select columns
    if typeof callback is 'function'
      query.exec callback
    return query

  ##
  # Specifies orders of result
  # @param {String} [orders]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Array<Model>} callback.records
  # @return {Query}
  @order: (orders, callback) ->
    return if @_waitingForConnection @, @where, arguments

    if typeof orders is 'function'
      callback = orders
      orders = null
    query = new Query @
    query.order orders
    if typeof callback is 'function'
      query.exec callback
    return query

  ##
  # Counts records by conditions
  # @param {Object} [condition]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Number} callback.count
  # @return {Query}
  @count: (condition, callback) ->
    return if @_waitingForConnection @, @count, arguments

    if typeof condition is 'function'
      callback = condition
      condition = null
    query = new Query @
    query.where condition
    if typeof callback is 'function'
      query.count callback
    return query

  ##
  # Deletes records by conditions
  # @param {Object} [condition]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Number} callback.count
  # @return {Query}
  @delete: (condition, callback) ->
    return if @_waitingForConnection @, @delete, arguments

    if typeof condition is 'function'
      callback = condition
      condition = null
    query = new Query @
    query.where condition
    if typeof callback is 'function'
      query.delete callback
    return query

module.exports = ModelQuery
