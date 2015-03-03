# common modules to test cases

async = require 'async'

_g = {}

_g.cormo = require '../index'
_g.Connection = _g.cormo.Connection
_g.Model = _g.cormo.Model
_g.connection = undefined

# whether define models using CoffeeScript extends keyword or Connection::model
_g.use_coffeescript_class = Math.floor(Math.random() * 2) isnt 0

if process.env.DIRTY_TRACKING
  _g.Model.dirty_tracking = process.env.DIRTY_TRACKING is 'true'
else
  _g.Model.dirty_tracking = Math.floor(Math.random() * 2) isnt 0

console.log "Run test with dirty_tracking=#{_g.Model.dirty_tracking}"

_g.deleteAllRecords = (models, callback) ->
  _g.connection.applySchemas (error) ->
    return callback error if error
    async.forEach models, (model, callback) ->
      return callback null if not model
      archive = model.archive
      model.archive = false
      model.deleteAll (error, count) ->
        model.archive = archive
        callback error
    , callback

if process.env.TRAVIS is 'true'
  _g.db_configs =
    mysql:
      database: 'travis'
      user: 'travis'
    mongodb:
      database: 'travis'
    sqlite3:
      database: __dirname + '/test.sqlite3'
    sqlite3_memory: {}
    postgresql:
      database: 'travis'
      user: 'postgres'
    redis:
      database: 1
else
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

module.exports = _g
