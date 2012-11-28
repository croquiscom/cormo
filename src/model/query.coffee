Query = require '../query'

##
# Model query
# @namespace model
class ModelQuery
  @_createQueryAndRun: (criteria, data, operation, callback) ->
    query = new Query @
    query[criteria] data
    if typeof callback is 'function'
      query[operation] callback
    query

  @_createOptionalQueryAndRun: (criteria, data, operation, callback) ->
    if typeof data is 'function'
      @_createQueryAndRun criteria, null, operation, data
    else
      @_createQueryAndRun criteria, data, operation, callback

  ##
  # Finds a record by id
  # @param {RecordID|Array<RecordID>} id
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Model|Array<Model>} callback.record
  # @return {Query}
  # @throws Error('not found')
  @find: (id, callback) ->
    @_createQueryAndRun 'find', id, 'exec', callback

  ##
  # Finds records by ids while preserving order.
  # @param {Array<RecordID>} ids
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Array<Model>} callback.records
  # @return {Query}
  # @throws Error('not found')
  @findPreserve: (ids, callback) ->
    @_createQueryAndRun 'findPreserve', ids, 'exec', callback

  ##
  # Finds records by conditions
  # @param {Object} [condition]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Array<Model>} callback.records
  # @return {Query}
  @where: (condition, callback) ->
    @_createOptionalQueryAndRun 'where', condition, 'exec', callback

  ##
  # Selects columns for result
  # @param {String} [columns]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Array<Model>} callback.records
  # @return {Query}
  @select: (columns, callback) ->
    @_createOptionalQueryAndRun 'select', columns, 'exec', callback

  ##
  # Specifies orders of result
  # @param {String} [orders]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Array<Model>} callback.records
  # @return {Query}
  @order: (orders, callback) ->
    @_createOptionalQueryAndRun 'order', orders, 'exec', callback

  ##
  # Counts records by conditions
  # @param {Object} [condition]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Number} callback.count
  # @return {Query}
  @count: (condition, callback) ->
    @_createOptionalQueryAndRun 'where', condition, 'count', callback

  ##
  # Deletes records by conditions
  # @param {Object} [condition]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Number} callback.count
  # @return {Query}
  @delete: (condition, callback) ->
    @_createOptionalQueryAndRun 'where', condition, 'delete', callback

module.exports = ModelQuery
