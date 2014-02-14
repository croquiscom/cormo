# common modules to test cases

async = require 'async'

global._g = {}

_g.cormo = require '../index'
_g.Connection = _g.cormo.Connection
_g.Model = _g.cormo.Model
_g.connection = undefined

# whether define models using CoffeeScript extends keyword or Connection::model
_g.use_coffeescript_class = Math.floor(Math.random() * 2) isnt 0

_g.Model.dirty_tracking = Math.floor(Math.random() * 2) isnt 0
_g.Model.eliminate_null = Math.floor(Math.random() * 2) isnt 0

_g.dropModels = (models, callback) ->
  async.forEach models, (model, callback) ->
    return callback null if not model
    model.drop callback
  , callback

_g.deleteAllRecords = (models, callback) ->
  async.forEach models, (model, callback) ->
    return callback null if not model
    archive = model.archive
    model.archive = false
    model.deleteAll (error, count) ->
      model.archive = archive
      callback error
  , callback

_g.db_configs =
  mysql:
    database: 'test'
  mongodb:
    database: 'test'
  sqlite3:
    database: __dirname + '/test.sqlite3'
  sqlite3_memory: {}
  postgresql:
    database: 'test'
  redis:
    database: 1
