async = require 'async'
types = require '../types'
util = require '../util'

##
# Base class for adapters
# @namespace adapter
class AdapterBase
  ##
  # Wraps adapter specific errors
  # @param {String} msg CORMO's error message
  # @param {Error} cause adapter specific error object
  @wrapError: (msg, cause) ->
    error = new Error msg
    error.cause = cause
    return error

  ##
  # Applies schema.
  # Creates tables, alter tables, create indexes, or etc. depending adapters
  # @abstract
  # @param {String} model
  # @nodejscallback
  # @see Connection::applySchemas
  applySchema: (model, callback) -> callback null

  ##
  # Drops a model from the database
  # @abstract
  # @param {String} model
  # @nodejscallback
  # @see Model.drop
  drop: (model, callback) -> callback new Error 'not implemented'

  idToDB: (value) ->
    value

  valueToDB: (value, column, property) ->
    if property.type is types.Object or property.array
      JSON.stringify value
    else if value?
      value
    else
      null

  _getModelID: (data) ->
    data.id

  valueToModel: (value, property) ->
    if property.type is types.Object or property.array
      JSON.parse value
    else
      value

  setValuesFromDB: (instance, data, schema, selected_columns) ->
    selected_columns = Object.keys schema if not selected_columns
    support_nested = @support_nested
    for column in selected_columns
      property = schema[column]
      parts = property._parts
      value = if support_nested
        util.getPropertyOfPath data, parts
      else
        data[property._dbname]
      if value?
        value = @valueToModel value, property
      else
        value = null
      util.setPropertyOfPath instance, parts, value

  _refineRawInstance: (model, data, selected_columns, selected_columns_raw) ->
    model = @_connection.models[model]
    instance = {}
    @setValuesFromDB instance, data, model._schema, selected_columns

    model._collapseNestedNulls instance, selected_columns_raw, null

    instance.id = @_getModelID data

    return instance

  _convertToModelInstance: (model, data, selected_columns, selected_columns_raw) ->
    id = @_getModelID(data)
    modelClass = @_connection.models[model]
    return new modelClass data, id, selected_columns, selected_columns_raw

  _convertToGroupInstance: (model, data, group_by, group_fields) ->
    instance = {}
    if group_by
      schema = @_connection.models[model]._schema
      for field in group_by
        property = schema[field]
        if property
          instance[field] = @valueToModel data[field], property
    for field, expr of group_fields
      op = Object.keys(expr)[0]
      if op is '$sum'
        instance[field] = Number data[field]
    return instance

  ##
  # Creates a record
  # @abstract
  # @param {String} model
  # @param {Object} data
  # @return {RecordID}
  # @nodejscallback
  create: (model, data, callback) -> callback new Error 'not implemented'

  ##
  # Creates records
  # @abstract
  # @param {String} model
  # @param {Array<Object>} data
  # @return {Array<RecordID>}
  # @nodejscallback
  createBulk: (model, data, callback) -> callback new Error 'not implemented'

  _createBulkDefault: (model, data, callback) ->
    async.map data, (item, callback) =>
      @create model, item, util.bindDomain callback
    , callback

  ##
  # Updates a record
  # @abstract
  # @param {String} model
  # @param {Object} data
  # @nodejscallback
  update: (model, data, callback) -> callback new Error 'not implemented'

  ##
  # Updates some fields of records that match conditions
  # @abstract
  # @param {String} model
  # @param {Object} data
  # @param {Object} conditions
  # @param {Object} options
  # @nodejscallback
  updatePartial: (model, data, conditions, options, callback) -> callback new Error 'not implemented'

  ##
  # Finds a record by id
  # @abstract
  # @param {String} model
  # @param {RecordID} id
  # @param {Object} options
  # @return {Model}
  # @nodejscallback
  # @throws {Error('not found')}
  # @see Query::exec
  findById: (model, id, options, callback) -> callback new Error 'not implemented'

  ##
  # Finds records
  # @abstract
  # @param {String} model
  # @param {Object} conditions
  # @param {Object} options
  # @return {Array<Model>}
  # @nodejscallback
  # @see Query::exec
  find: (model, conditions, options, callback) -> callback new Error 'not implemented'

  ##
  # Counts records
  # @abstract
  # @param {String} model
  # @param {Object} conditions
  # @return {Number}
  # @nodejscallback
  # @see Query::count
  count: (model, conditions, callback) -> callback new Error 'not implemented'

  ##
  # Deletes records from the database
  # @abstract
  # @param {String} model
  # @param {Object} conditions
  # @return {Number}
  # @nodejscallback
  # @see Query::delete
  delete: (model, conditions, callback) -> callback new Error 'not implemented'

  ##
  # Closes connection
  close: ->

module.exports = AdapterBase

if process.env.NODE_ENV is 'test'
  AdapterBase.wrapError = (msg, cause) ->
    return new Error msg + ' caused by ' + cause.toString()
