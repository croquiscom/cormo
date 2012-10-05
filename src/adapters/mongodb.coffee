try
  mongodb = require 'mongodb'
catch error
  console.log 'Install mongodb module to use this adapter'
  process.exit 1

ObjectID = mongodb.ObjectID

AdapterBase = require './base'
tableize = require('../inflector').tableize

###
# Adapter for MongoDB
###
class MongoDBAdapter extends AdapterBase
  ###
  # Creates a MongoDB adapter
  # @param {mongodb.Db} client
  ###
  constructor: (connection, client) ->
    @_connection = connection
    @_client = client
    @_collections = {}

  _collection: (name) ->
    name = tableize name
    if not @_collections[name]
      return @_collections[name] = new mongodb.Collection @_client, name
    else
      return @_collections[name]

  ###
  # Drops a model from the database
  # @param {String} model
  # @param {Function} callback
  # @param {Error} callback.error
  # @see DBModel.drop
  ###
  drop: (model, callback) ->
    name = tableize model
    delete @_collections[name]
    @_client.dropCollection name, (error) ->
      # ignore not found error
      if error and error.errmsg isnt 'ns not found'
        return callback MongoDBAdapter.wrapError 'unknown error', error
      callback null

  ###
  # Deletes all records from the database
  # @param {String} model
  # @param {Function} callback
  # @param {Error} callback.error
  # @see DBModel.deleteAll
  ###
  deleteAll: (model, callback) ->
    @_collection(model).remove {}, (error) ->
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      callback null

  ###
  # Create a record
  # @param {String} model
  # @param {Object} data
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {String} callback.id
  ###
  create: (model, data, callback) ->
    @_collection(model).insert data, safe: true, (error, result) ->
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      id = result?[0]?._id.toString()
      if id
        delete data._id
        callback null, id
      else
        callback new Error 'unexpected result'

  _convertToModelInstance: (model, data) ->
    modelClass = @_connection.models[model]
    record = new modelClass()
    record.id = data._id.toString()
    for field of modelClass._schema
      record[field] = data[field]
    return record

  ###
  # Finds a record by id
  # @param {String} model
  # @param {String} id
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {DBModel} callback.record
  ###
  findById: (model, id, callback) ->
    @_collection(model).findOne _id: new ObjectID(id), (error, result) =>
      return callback MongoDBAdapter.wrapError 'unknown error', error if error or not result
      callback null, @_convertToModelInstance model, result

  ###
  # Finds records
  # @param {String} model
  # @param {Object} conditions
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Array<DBModel>} callback.records
  ###
  find: (model, conditions, callback) ->
    @_collection(model).find conditions, (error, cursor) =>
      return callback MongoDBAdapter.wrapError 'unknown error', error if error or not cursor
      cursor.toArray (error, result) =>
        return callback MongoDBAdapter.wrapError 'unknown error', error if error or not cursor
        callback null, result.map (instance) => @_convertToModelInstance model, instance

  ###
  # Creates a MongoDB adapter
  # @param {Connection} connection
  # @param {Object} settings
  # @param {String} [settings.host='localhost']
  # @param {Number} [settings.port=27017]
  # @param {String} settings.database
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {MongoDBAdapter} callback.adapter
  ###
  @createAdapter: (connection, settings, callback) ->
    server = new mongodb.Server settings.host or 'localhost', settings.port or 27017, {}
    db = new mongodb.Db settings.database, server, {}
    db.open (error, client) ->
      return callback MongoDBAdapter.wrapError 'unknown error', error if error
      callback null, new MongoDBAdapter connection, client

module.exports = MongoDBAdapter.createAdapter
