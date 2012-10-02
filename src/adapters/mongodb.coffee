try
  mongodb = require 'mongodb'
catch error
  console.log 'Install mongodb module to use this adapter'
  process.exit 1

AdapterBase = require './base'

###
# Adapter for MongoDB
# @param {mongodb.Db} client
###
class MongoDBAdapter extends AdapterBase
  constructor: (client) ->
    @_client = client
    @_collections = {}

  _collection: (name) ->
    name = MongoDBAdapter.toCollectionName name
    if not @_collections[name]
      return @_collections[name] = new mongodb.Collection @_client, name
    else
      return @_collections[name]
    
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
      if result?[0]?._id
        callback null, result[0]._id
      else
        callback new Error 'unexpected result'

###
# Initialize MongoDB adapter
# @param {Connection} connection
# @param {Object} settings
# @param {String} [settings.host='localhost']
# @param {Number} [settings.port=27017]
# @param {String} settings.database
# @param {Function} callback
# @param {Error} callback.error
# @param {MongoDBAdapter} callback.adapter
###
module.exports = (connection, settings, callback) ->
  server = new mongodb.Server settings.host or 'localhost', settings.port or 27017, {}
  db = new mongodb.Db settings.database, server, {}
  db.open (error, client) ->
    return callback MongoDBAdapter.wrapError 'unknown error', error if error
    callback null, new MongoDBAdapter client
