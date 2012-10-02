class DBModel
  constructor: ->

  save: (callback) ->
    if @id
      # TODO update
    else
      ctor = @constructor
      ctor._connection._adapter.create ctor._name, @, (error, id) =>
        if not error
          @id = id
        callback error

  @drop: (callback) ->
    @_connection._adapter.drop @_name, callback

  @deleteAll: (callback) ->
    @_connection._adapter.deleteAll @_name, callback

module.exports = DBModel
