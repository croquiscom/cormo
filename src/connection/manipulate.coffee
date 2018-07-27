inflector = require '../util/inflector'
types = require '../types'

##
# Manipulate data
# @namespace connection
ConnectionManipulateMixin = (Base) -> class extends Base
  _manipulateCreate: (model, data) ->
    model = inflector.camelize model
    if not @models[model]
      throw new Error("model #{model} does not exist")
    model = @models[model]

    return await model.create data, skip_log: true

  _manipulateDelete: (model, data) ->
    model = inflector.camelize model
    if not @models[model]
      throw new Error("model #{model} does not exist")
    model = @models[model]

    await model.where(data).delete skip_log: true
    return

  _manipulateDeleteAllModels: ->
    for model in Object.keys(@models)
      if model is '_Archive'
        return
      model = @models[model]
      await model.where().delete skip_log: true
    return

  _manipulateDropModel: (model) ->
    model = inflector.camelize model
    if not @models[model]
      throw new Error("model #{model} does not exist")
    model = @models[model]

    await model.drop()
    return

  _manipulateDropAllModels: ->
    await @dropAllModels()
    return

  _manipulateFind: (model, data) ->
    model = inflector.camelize inflector.singularize model
    if not @models[model]
      throw new Error("model #{model} does not exist")
    model = @models[model]

    await model.where(data).exec skip_log: true

  _manipulateConvertIds: (id_to_record_map, model, data) ->
    model = inflector.camelize model
    if not @models[model]
      return
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
    return

  ##
  # Manipulate data
  # @param {Array<Object>} commands
  # @return {Object}
  # @promise
  manipulate: (commands) ->
    @log '<conn>', 'manipulate', commands

    await @_checkSchemaApplied()
    id_to_record_map = {}
    if not Array.isArray commands
      commands = [commands]
    for command in commands
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
        throw new Error('invalid command: '+JSON.stringify(command))
      else if key.substr(0, 7) is 'create_'
        model = key.substr 7
        id = data.id
        delete data.id
        @_manipulateConvertIds id_to_record_map, model, data
        record = await @_manipulateCreate model, data
        id_to_record_map[id] = record if id
      else if key.substr(0, 7) is 'delete_'
        model = key.substr 7
        await @_manipulateDelete model, data
      else if key is 'deleteAll'
        await @_manipulateDeleteAllModels()
      else if key.substr(0, 5) is 'drop_'
        model = key.substr 5
        await @_manipulateDropModel model
      else if key is 'dropAll'
        await @_manipulateDropAllModels()
      else if key.substr(0, 5) is 'find_'
        model = key.substr 5
        id = data.id
        delete data.id
        if not id
          continue
        records = await @_manipulateFind model, data
        id_to_record_map[id] = records
      else
        throw new Error('unknown command: '+key)
    return id_to_record_map

module.exports = ConnectionManipulateMixin
