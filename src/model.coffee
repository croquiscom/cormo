class DBModel
  constructor: (data) ->
    data = data or {}
    schema = @constructor._schema
    Object.keys(schema).forEach (field) =>
      if data[field]
        @[field] = data[field]

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

  @drop: (callback) ->
    @_connection._adapter.drop @_name, callback

  @deleteAll: (callback) ->
    @_connection._adapter.deleteAll @_name, callback

module.exports = DBModel
