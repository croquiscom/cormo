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

module.exports = DBModel
