async = require 'async'
inflector = require '../inflector'

##
# Manipulate data
# @namespace connection
class ConnectionManipulate
  _manipulateCreation: (model, data, callback) ->
    model = inflector.camelize model
    return callback new Error("model #{model} does not exist") if not @models[model]
    model = @models[model]

    model.create data, (error, record) ->
      callback error

  _manipulateDeletion: (model, data, callback) ->
    model = inflector.camelize model
    return callback new Error("model #{model} does not exist") if not @models[model]
    model = @models[model]

    model.delete data, (error, count) ->
      callback error

  ##
  # Manipulate data
  # @param {Array<Object>} commands
  # @param {Function} callback
  # @param {Error} callback.error
  manipulate: (commands, callback) ->
    commands = [commands] if not Array.isArray commands
    async.forEachSeries commands, (command, callback) =>
      if typeof command is 'object'
        key = Object.keys command
        if key.length is 1
          key = key[0]
          data = command[key]
        else
          key = undefined
      else if typeof command is 'string'
        key = command
      return callback new Error('invalid command: '+JSON.stringify(command)) if not key
      if key.substr(0, 7) is 'create_'
        model = key.substr 7
        @_manipulateCreation model, data, callback
      else if key.substr(0, 7) is 'delete_'
        model = key.substr 7
        @_manipulateDeletion model, data, callback
      else
        return callback new Error('unknown command: '+key)
    , (error) ->
      callback error

module.exports = ConnectionManipulate
