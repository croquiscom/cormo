# common modules to test cases

global.async = require 'async'

global.cormo = require '../index'
global.Connection = cormo.Connection
global.Model = cormo.Model
global.connection = undefined

Model.dirty_tracking = Math.floor(Math.random() * 2) isnt 0
Model.eliminate_null = Math.floor(Math.random() * 2) isnt 0

# 'global.should =' does not work because should module override Object.prototype.should
Object.defineProperty global, 'should', value: require 'should'

global.dropModels = (models, callback) ->
  async.forEach models, (model, callback) ->
    model.drop callback
  , callback

global.deleteAllRecords = (models, callback) ->
  async.forEach models, (model, callback) ->
    model.deleteAll callback
  , callback
