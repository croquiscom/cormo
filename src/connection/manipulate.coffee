async = require 'async'
inflector = require '../inflector'
types = require '../types'

##
# Manipulate data
# @namespace connection
class ConnectionManipulate
  _manipulateCreation: (model, data, callback) ->
    model = inflector.camelize model
    return callback new Error("model #{model} does not exist") if not @models[model]
    model = @models[model]

    model.create data, (error, record) ->
      callback error, record

  _manipulateDeletion: (model, data, callback) ->
    model = inflector.camelize model
    return callback new Error("model #{model} does not exist") if not @models[model]
    model = @models[model]

    model.delete data, (error, count) ->
      callback error

  _manipulateDeleteAllModels: (callback) ->
    async.forEach Object.keys(@models), (model, callback) =>
      model = @models[model]
      model.delete (error, count) ->
        callback error
    , callback

  _manipulateConvertIds: (id_to_record_map, model, data) ->
    model = inflector.camelize model
    return if not @models[model]
    model = @models[model]

    for column, property of model._schema
      if property.record_id and data.hasOwnProperty column
        data[column] = id_to_record_map[data[column]].id

  ##
  # Manipulate data
  # @param {Array<Object>} commands
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Object} callback.id_to_record_map
  manipulate: (commands, callback) ->
    id_to_record_map = {}
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
        id = data.id
        delete data.id
        @_manipulateConvertIds id_to_record_map, model, data
        @_manipulateCreation model, data, (error, record) ->
          return callback error if error
          id_to_record_map[id] = record if id
          callback null
      else if key.substr(0, 7) is 'delete_'
        model = key.substr 7
        @_manipulateDeletion model, data, callback
      else if key is 'deleteAll'
        @_manipulateDeleteAllModels callback
      else
        return callback new Error('unknown command: '+key)
    , (error) ->
      callback error, id_to_record_map

module.exports = ConnectionManipulate
