###
# Base class for models
###
class DBModel
  ###
  # Creates a record
  # @param {Object} data
  ###
  constructor: (data) ->
    data = data or {}
    schema = @constructor._schema
    Object.keys(schema).forEach (field) =>
      if data[field]
        @[field] = data[field]

  ###
  # Saves data to the database
  ###
  save: (callback) ->
    if @id
      # TODO update
    else
      if Object.keys(@).length is 0
        return callback new Error 'empty data'
      ctor = @constructor
      ctor._connection._adapter.create ctor._name, @, (error, id) =>
        if not error
          @id = id
        callback error

  ###
  # Finds a record by id
  # @param {String} id
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {DBModel} callback.record
  ###
  @find: (id, callback) ->
    @_connection._adapter.findById @_name, id, callback

  ###
  # Drops this model from the database
  # @param {Function} callback
  # @param {Error} callback.error
  ###
  @drop: (callback) ->
    @_connection._adapter.drop @_name, callback

  ###
  # Deletes all records from the database
  # @param {Function} callback
  # @param {Error} callback.error
  ###
  @deleteAll: (callback) ->
    @_connection._adapter.deleteAll @_name, callback

module.exports = DBModel
