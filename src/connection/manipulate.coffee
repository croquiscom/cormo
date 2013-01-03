async = require 'async'
inflector = require '../inflector'
types = require '../types'

##
# Manipulate data
# @namespace connection
class ConnectionManipulate
  _manipulateCreate: (model, data, callback) ->
    model = inflector.camelize model
    return callback new Error("model #{model} does not exist") if not @models[model]
    model = @models[model]

    model.create data, skip_log: true, (error, record) ->
      callback error, record

  _manipulateDelete: (model, data, callback) ->
    model = inflector.camelize model
    return callback new Error("model #{model} does not exist") if not @models[model]
    model = @models[model]

    model.where(data).delete skip_log: true, (error, count) ->
      callback error

  _manipulateDeleteAllModels: (callback) ->
    async.forEach Object.keys(@models), (model, callback) =>
      model = @models[model]
      model.where().delete skip_log: true, (error, count) ->
        callback error
    , callback

  _manipulateDropModel: (model, callback) ->
    model = inflector.camelize model
    return callback new Error("model #{model} does not exist") if not @models[model]
    model = @models[model]

    model.drop callback

  _manipulateDropAllModels: (callback) ->
    async.forEach Object.keys(@models), (model, callback) =>
      model = @models[model]
      model.drop callback
    , callback

  _manipulateConvertIds: (id_to_record_map, model, data) ->
    model = inflector.camelize model
    return if not @models[model]
    model = @models[model]

    for column, property of model._schema
      if property.record_id and data.hasOwnProperty column
        record = id_to_record_map[data[column]]
        if record
          data[column] = record.id

  ##
  # Manipulate data
  # @param {Array<Object>} commands
  # @param {Function} callback
  # @param {Error} callback.error
  # @param {Object} callback.id_to_record_map
  manipulate: (commands, callback) ->
    @log '<conn>', 'manipulate', commands

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
        @_manipulateCreate model, data, (error, record) ->
          return callback error if error
          id_to_record_map[id] = record if id
          callback null
      else if key.substr(0, 7) is 'delete_'
        model = key.substr 7
        @_manipulateDelete model, data, callback
      else if key is 'deleteAll'
        @_manipulateDeleteAllModels callback
      else if key.substr(0, 5) is 'drop_'
        model = key.substr 5
        @_manipulateDropModel model, callback
      else if key is 'dropAll'
        @_manipulateDropAllModels callback
      else
        return callback new Error('unknown command: '+key)
    , (error) ->
      callback error, id_to_record_map

module.exports = ConnectionManipulate
