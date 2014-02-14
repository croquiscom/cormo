async = require 'async'
types = require '../types'

_bindDomain = (fn) -> if d = process.domain then d.bind fn else fn

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
  # @param {Function} callback
  # @param {Error} callback.error
  # @see Connection::applySchemas
  applySchema: (model, callback) -> callback null

  ##
  # Drops a model from the database
  # @abstract
  # @param {String} model
  # @param {Function} callback
  # @param {Error} callback.error
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

  _refineRawInstance: (model, data, selected_columns) ->
    id = @_getModelID(data)
    Object.defineProperty data, 'id', configurable: false, enumerable: true, writable: false, value: id
    return data

  _convertToModelInstance: (model, data, selected_columns) ->
    id = @_getModelID(data)
    modelClass = @_connection.models[model]
    return new modelClass data, id, selected_columns

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
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {RecordID} callback.id
  create: (model, data, callback) -> callback new Error 'not implemented'

  ##
  # Creates records
  # @abstract
  # @param {String} model
  # @param {Array<Object>} data
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Array<RecordID>} callback.ids
  createBulk: (model, data, callback) -> callback new Error 'not implemented'

  _createBulkDefault: (model, data, callback) ->
    async.map data, (item, callback) =>
      @create model, item, _bindDomain callback
    , callback

  ##
  # Updates a record
  # @abstract
  # @param {String} model
  # @param {Object} data
  # @param {Function} callback
  # @param {Error} callback.error
  update: (model, data, callback) -> callback new Error 'not implemented'

  ##
  # Updates some fields of records that match conditions
  # @abstract
  # @param {String} model
  # @param {Object} data
  # @param {Object} conditions
  # @param {Object} options
  # @param {Function} callback
  # @param {Error} callback.error
  updatePartial: (model, data, conditions, options, callback) -> callback new Error 'not implemented'

  ##
  # Finds a record by id
  # @abstract
  # @param {String} model
  # @param {RecordID} id
  # @param {Object} options
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Model} callback.record
  # @throws {Error('not found')}
  # @see Query::exec
  findById: (model, id, options, callback) -> callback new Error 'not implemented'

  ##
  # Finds records
  # @abstract
  # @param {String} model
  # @param {Object} conditions
  # @param {Object} options
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Array<Model>} callback.records
  # @see Query::exec
  find: (model, conditions, options, callback) -> callback new Error 'not implemented'

  ##
  # Counts records
  # @abstract
  # @param {String} model
  # @param {Object} conditions
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Number} callback.count
  # @see Query::count
  count: (model, conditions, callback) -> callback new Error 'not implemented'

  ##
  # Deletes records from the database
  # @abstract
  # @param {String} model
  # @param {Object} conditions
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Number} callback.count
  # @see Query::delete
  delete: (model, conditions, callback) -> callback new Error 'not implemented'

  ##
  # Closes connection
  close: ->

module.exports = AdapterBase

if process.env.NODE_ENV is 'test'
  AdapterBase.wrapError = (msg, cause) ->
    return new Error msg + ' caused by ' + cause.toString()
