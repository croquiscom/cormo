console_future = require '../console_future'
Query = require '../query'

##
# Model query
# @namespace model
class ModelQuery
  @_createQueryAndRun: (criteria, data, callback) ->
    query = new Query @
    query[criteria] data
    if typeof callback is 'function'
      query.exec callback
    query

  @_createOptionalQueryAndRun: (criteria, data, callback) ->
    if typeof data is 'function'
      @_createQueryAndRun criteria, null, data
    else
      @_createQueryAndRun criteria, data, callback

  ##
  # Creates q query object
  @query: ->
    new Query @

  ##
  # Finds a record by id
  # @param {RecordID|Array<RecordID>} id
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Model|Array<Model>} callback.record
  # @return {Query}
  # @throws {Error('not found')}
  @find: (id, callback) ->
    @_createQueryAndRun 'find', id, callback

  ##
  # Finds records by ids while preserving order.
  # @param {Array<RecordID>} ids
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Array<Model>} callback.records
  # @return {Query}
  # @throws {Error('not found')}
  @findPreserve: (ids, callback) ->
    @_createQueryAndRun 'findPreserve', ids, callback

  ##
  # Finds records by conditions
  # @param {Object} [condition]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Array<Model>} callback.records
  # @return {Query}
  @where: (condition, callback) ->
    @_createOptionalQueryAndRun 'where', condition, callback

  ##
  # Selects columns for result
  # @param {String} [columns]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Array<Model>} callback.records
  # @return {Query}
  @select: (columns, callback) ->
    @_createOptionalQueryAndRun 'select', columns, callback

  ##
  # Specifies orders of result
  # @param {String} [orders]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Array<Model>} callback.records
  # @return {Query}
  @order: (orders, callback) ->
    @_createOptionalQueryAndRun 'order', orders, callback

  ##
  # Groups result records
  # @param {String} group_by
  # @param {Object} fields
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Array<Object>} callback.records
  # @return {Query}
  @group: (group_by, fields, callback) ->
    query = new Query @
    query.group group_by, fields
    if typeof callback is 'function'
      query.exec callback
    query

  ##
  # Counts records by conditions
  # @param {Object} [condition]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Number} callback.count
  @count: (condition, callback) ->
    if typeof condition is 'function'
      callback = condition
      condition = null

    console_future.execute callback, (callback) =>
      callback = (->) if typeof callback isnt 'function'
      query = new Query @
      query.where condition
      query.count callback

  ##
  # Updates some fields of records that match conditions
  # @param {Object} updates
  # @param {Object} [condition]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Number} callback.count
  @update: (updates, condition, callback) ->
    if typeof condition is 'function'
      callback = condition
      condition = null

    console_future.execute callback, (callback) =>
      callback = (->) if typeof callback isnt 'function'
      query = new Query @
      query.where condition
      query.update updates, callback

  ##
  # Deletes records by conditions
  # @param {Object} [condition]
  # @param {Function} [callback]
  # @param {Error} callback.error
  # @param {Number} callback.count
  @delete: (condition, callback) ->
    if typeof condition is 'function'
      callback = condition
      condition = null

    console_future.execute callback, (callback) =>
      callback = (->) if typeof callback isnt 'function'
      query = new Query @
      query.where condition
      query.delete callback

module.exports = ModelQuery
