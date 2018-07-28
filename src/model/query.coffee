Query = require '../query'

##
# Model query
# @namespace model
ModelQueryMixin = (Base) -> class extends Base
  @_createQueryAndRun: (criteria, data) ->
    query = new Query @
    query[criteria] data
    query

  @_createOptionalQueryAndRun: (criteria, data) ->
    @_createQueryAndRun criteria, data

  ##
  # Creates q query object
  @query: ->
    new Query @

  ##
  # Finds a record by id
  # @param {RecordID|Array<RecordID>} id
  # @return {Query}
  # @throws {Error('not found')}
  @find: (id) ->
    @_createQueryAndRun 'find', id

  ##
  # Finds records by ids while preserving order.
  # @param {Array<RecordID>} ids
  # @return {Query}
  # @throws {Error('not found')}
  @findPreserve: (ids) ->
    @_createQueryAndRun 'findPreserve', ids

  ##
  # Finds records by conditions
  # @param {Object} [condition]
  # @return {Query}
  @where: (condition) ->
    @_createOptionalQueryAndRun 'where', condition

  ##
  # Selects columns for result
  # @param {String} [columns]
  # @return {Query}
  @select: (columns) ->
    @_createOptionalQueryAndRun 'select', columns

  ##
  # Specifies orders of result
  # @param {String} [orders]
  # @return {Query}
  @order: (orders) ->
    @_createOptionalQueryAndRun 'order', orders

  ##
  # Groups result records
  # @param {String} group_by
  # @param {Object} fields
  # @return {Query}
  @group: (group_by, fields) ->
    query = new Query @
    query.group group_by, fields
    query

  ##
  # Counts records by conditions
  # @param {Object} [condition]
  # @return {Number}
  # @promise
  @count: (condition) ->
    await new Query @
      .where condition
      .count()

  ##
  # Updates some fields of records that match conditions
  # @param {Object} updates
  # @param {Object} [condition]
  # @return {Number}
  # @promise
  @update: (updates, condition) ->
    await new Query @
      .where condition
      .update updates

  ##
  # Deletes records by conditions
  # @param {Object} [condition]
  # @return {Number}
  # @promise
  @delete: (condition) ->
    await new Query @
      .where condition
      .delete()

module.exports = ModelQueryMixin
