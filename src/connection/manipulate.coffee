inflector = require '../util/inflector'
Promise = require 'bluebird'
types = require '../types'

##
# Manipulate data
# @namespace connection
ConnectionManipulateMixin = (Base) -> class extends Base
  _manipulateCreate: (model, data) ->
    model = inflector.camelize model
    return Promise.reject new Error("model #{model} does not exist") if not @models[model]
    model = @models[model]

    model.create data, skip_log: true

  _manipulateDelete: (model, data) ->
    model = inflector.camelize model
    return Promise.reject new Error("model #{model} does not exist") if not @models[model]
    model = @models[model]

    model.where(data).delete skip_log: true

  _manipulateDeleteAllModels: ->
    Promise.each Object.keys(@models), (model) =>
      if model is '_Archive'
        return
      model = @models[model]
      model.where().delete skip_log: true

  _manipulateDropModel: (model) ->
    model = inflector.camelize model
    return Promise.reject new Error("model #{model} does not exist") if not @models[model]
    model = @models[model]

    model.drop()

  _manipulateDropAllModels: ->
    @dropAllModels()

  _manipulateFind: (model, data) ->
    model = inflector.camelize inflector.singularize model
    return Promise.reject new Error("model #{model} does not exist") if not @models[model]
    model = @models[model]

    model.where(data).exec skip_log: true

  _manipulateConvertIds: (id_to_record_map, model, data) ->
    model = inflector.camelize model
    return if not @models[model]
    model = @models[model]

    for column, property of model._schema
      if property.record_id and data.hasOwnProperty column
        if property.array and Array.isArray data[column]
          data[column] = data[column].map (value) ->
            record = id_to_record_map[value]
            return if record then record.id else value
        else
          record = id_to_record_map[data[column]]
          if record
            data[column] = record.id

  ##
  # Manipulate data
  # @param {Array<Object>} commands
  # @return {Object}
  # @promise
  # @nodejscallback
  manipulate: (commands, callback) ->
    @log '<conn>', 'manipulate', commands

    @_checkSchemaApplied().then =>
      id_to_record_map = {}
      if not Array.isArray commands
        commands = [commands]
      Promise.each commands, (command) =>
        if typeof command is 'object'
          key = Object.keys command
          if key.length is 1
            key = key[0]
            data = command[key]
          else
            key = undefined
        else if typeof command is 'string'
          key = command
        if not key
          Promise.reject new Error('invalid command: '+JSON.stringify(command))
        else if key.substr(0, 7) is 'create_'
          model = key.substr 7
          id = data.id
          delete data.id
          @_manipulateConvertIds id_to_record_map, model, data
          @_manipulateCreate model, data
          .then (record) ->
            id_to_record_map[id] = record if id
        else if key.substr(0, 7) is 'delete_'
          model = key.substr 7
          @_manipulateDelete model, data
        else if key is 'deleteAll'
          @_manipulateDeleteAllModels()
        else if key.substr(0, 5) is 'drop_'
          model = key.substr 5
          @_manipulateDropModel model
        else if key is 'dropAll'
          @_manipulateDropAllModels()
        else if key.substr(0, 5) is 'find_'
          model = key.substr 5
          id = data.id
          delete data.id
          if not id
            return
          @_manipulateFind model, data
          .then (records) ->
            id_to_record_map[id] = records
        else
          Promise.reject new Error('unknown command: '+key)
      .then ->
        id_to_record_map
    .nodeify callback

module.exports = ConnectionManipulateMixin
