# common modules to test cases

_g = {}

_g.cormo = require '../..'
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

_g.deleteAllRecords = (models) ->
  await _g.connection.applySchemas()
  for model in models
    if not model
      continue
    archive = model.archive
    model.archive = false
    await model.deleteAll()
    model.archive = archive
  return

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
      database: 'travis_ci_test'
      user: 'postgres'
    redis:
      database: 1
else
  _g.db_configs =
    mysql:
      port: 21860
      database: 'cormo_test'
      user: 'cormo_test'
      password: 'cormo_test'
      redis_cache:
        port: 21863
    mongodb:
      port: 21861
      database: 'test'
      redis_cache:
        port: 21863
    sqlite3:
      database: __dirname + '/test.sqlite3'
      redis_cache:
        port: 21863
    sqlite3_memory:
      redis_cache:
        port: 21863
    postgresql:
      port: 21862
      database: 'cormo_test'
      user: 'cormo_test'
      password: 'cormo_test'
      redis_cache:
        port: 21863
    redis:
      port: 21863
      database: 1
      redis_cache:
        port: 21863

module.exports = _g
