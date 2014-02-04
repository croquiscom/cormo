# common modules to test cases

global._g = {}

_g.async = require 'async'

_g.cormo = require '../index'
_g.Connection = _g.cormo.Connection
_g.Model = _g.cormo.Model
_g.connection = undefined

_g.Model.dirty_tracking = Math.floor(Math.random() * 2) isnt 0
_g.Model.eliminate_null = Math.floor(Math.random() * 2) isnt 0

_g.dropModels = (models, callback) ->
  _g.async.forEach models, (model, callback) ->
    return callback null if not model
    model.drop callback
  , callback

_g.deleteAllRecords = (models, callback) ->
  _g.async.forEach models, (model, callback) ->
    return callback null if not model
    archive = model.archive
    model.archive = false
    model.deleteAll (error, count) ->
      model.archive = archive
      callback error
  , callback
