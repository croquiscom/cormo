async = require 'async'
stream = require 'stream'
types = require '../types'
util = require '../util'

##
# Base class for adapters
# @namespace adapter
class AdapterBase
  support_fractional_seconds: true
  support_upsert: true

  ##
  # Wraps adapter specific errors
  # @param {String} msg CORMO's error message
  # @param {Error} cause adapter specific error object
  @wrapError: (msg, cause) ->
    error = new Error msg
    error.cause = cause
    return error

  ##
  # Returns current schemas.
  # @abstract
  # @return {Object}
  # @returnprop {Object} tables
  # @nodejscallback
  # @see Connection::applySchemas
  getSchemas: () -> Promise.resolve tables: []

  ## Creates a table.
  # @abstract
  # @param {String} model
  # @nodejscallback
  # @see Connection::applySchemas
  createTable: (model) -> Promise.resolve()

  ## Adds a column to a table
  # @abstract
  # @param {String} model
  # @param {Object} column_property
  # @nodejscallback
  # @see Connection::applySchemas
  addColumn: (model, column_property) -> Promise.resolve()

  ## Creates an index.
  # @abstract
  # @param {String} model
  # @param {Object} index
  # @param {Object} index.columns
  # @param {Object} index.options
  # @param {String} index.options.name
  # @param {Boolean} index.options.unique
  # @nodejscallback
  # @see Connection::applySchemas
  createIndex: (model, index) -> Promise.resolve()

  ## Creates a foreign key.
  # @abstract
  # @param {String} model
  # @param {String} column
  # @param {String} type
  # @param {Class<Model>} references
  # @nodejscallback
  # @see Connection::applySchemas
  createForeignKey: (model, column, type, references) -> Promise.resolve()

  ##
  # Drops a model from the database
  # @abstract
  # @param {String} model
  # @nodejscallback
  # @see Model.drop
  drop: (model) -> Promise.reject 'not implemented'

  idToDB: (value) ->
    value

  valueToDB: (value, column, property) ->
    if property.type_class is types.Object or property.array
      JSON.stringify value
    else if value?
      value
    else
      null

  _getModelID: (data) ->
    data.id

  valueToModel: (value, property) ->
    if property.type_class is types.Object or property.array
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

  _convertToModelInstance: (model, data, options) ->
    if options.lean
      model = @_connection.models[model]
      instance = {}
      @setValuesFromDB instance, data, model._schema, options.select
      model._collapseNestedNulls instance, options.select_raw, null
      instance.id = @_getModelID data
      return instance
    else
      id = @_getModelID(data)
      modelClass = @_connection.models[model]
      return new modelClass data, id, options.select, options.select_raw

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
      if op in ['$sum', '$max', '$min']
        instance[field] = Number data[field]
    return instance

  ##
  # Creates a record
  # @abstract
  # @param {String} model
  # @param {Object} data
  # @return {RecordID}
  # @nodejscallback
  create: (model, data) -> Promise.reject new Error 'not implemented'

  ##
  # Creates records
  # @abstract
  # @param {String} model
  # @param {Array<Object>} data
  # @return {Array<RecordID>}
  # @nodejscallback
  createBulk: (model, data) -> Promise.reject new Error 'not implemented'

  _createBulkDefault: (model, data) ->
    await Promise.all data.map (item) =>
      @create model, item

  ##
  # Updates a record
  # @abstract
  # @param {String} model
  # @param {Object} data
  # @nodejscallback
  update: (model, data) -> Promise.reject new Error 'not implemented'

  ##
  # Updates some fields of records that match conditions
  # @abstract
  # @param {String} model
  # @param {Object} data
  # @param {Object} conditions
  # @param {Object} options
  # @nodejscallback
  updatePartial: (model, data, conditions, options) -> Promise.reject new Error 'not implemented'

  ##
  # Updates some fields of records that match conditions or inserts a new record
  # @abstract
  # @param {String} model
  # @param {Object} data
  # @param {Object} conditions
  # @param {Object} options
  # @nodejscallback
  upsert: (model, data, conditions, options) -> callback new Error 'not implemented'

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
  # Streams matching records
  # @abstract
  # @param {String} model
  # @param {Object} conditions
  # @param {Object} options
  # @return {Readable}
  # @see Query::stream
  stream: (model, conditions, options) ->
    readable = new stream.Readable objectMode: true
    readable._read = ->
      readable.emit 'error', new Error 'not implemented'
    readable

  ##
  # Counts records
  # @abstract
  # @param {String} model
  # @param {Object} conditions
  # @param {Object} options
  # @return {Number}
  # @nodejscallback
  # @see Query::count
  count: (model, conditions, options, callback) -> callback new Error 'not implemented'

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
