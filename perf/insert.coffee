async = require 'async'
Benchmark = require 'benchmark'
cormo = require '../index'
Connection = cormo.Connection
Model = cormo.Model

_dbs =
  mysql:
    database: 'test'
  mongodb:
    database: 'test'
  sqlite3:
    database: __dirname + '/test.sqlite3'
  sqlite3_memory: {}
  postgresql:
    database: 'test'

bulkData = [0...100].map (i) ->
  name: 'name'+i, age: i

async.forEachSeries Object.keys(_dbs), (db, callback) ->
  console.log '>>> Begin ' + db

  suite = new Benchmark.Suite()
  global.connection = new Connection db, _dbs[db]
  class User extends Model
    @column 'name', String
    @column 'age', Number

  suite.add 'insert 100', (deferred) ->
    async.timesSeries 100, (i, callback) ->
      User.create name: 'name'+i, age: i, (error, user) ->
        callback error
    , (error) ->
      return suite.abort() if error
      deferred.resolve()
  , defer: true

  suite.add 'insert 100 parallel', (deferred) ->
    async.times 100, (i, callback) ->
      User.create name: 'name'+i, age: i, (error, user) ->
        callback error
    , (error) ->
      return suite.abort() if error
      deferred.resolve()
  , defer: true

  suite.add 'insert 100 bulk', (deferred) ->
    User.createBulk bulkData, (error, users) ->
      return suite.abort() if error
      deferred.resolve()
  , defer: true

  suite.on 'cycle', (event) ->
    console.log event.target.toString()

  suite.on 'complete', ->
    callback null

  User.drop (error) ->
    return callback error if error
    connection.applySchemas (error) ->
      return callback error if error
      suite.run()
, (error) ->
  console.log error if error
  process.exit()
