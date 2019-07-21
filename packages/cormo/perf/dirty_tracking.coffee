async = require 'async'
Benchmark = require 'benchmark'
cormo = require '../index'
Connection = cormo.Connection
Model = cormo.BaseModel

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

sample = {}
for i in [0...30]
  sample['field'+i] = 'default'

async.forEachSeries Object.keys(_dbs), (db, callback) ->
  console.log '>>> Begin ' + db

  suite = new Benchmark.Suite()
  global.connection = new Connection db, _dbs[db]
  class On extends Model
  On.dirty_tracking = true
  class Off extends Model

  for i in [0...30]
    On.column 'field'+i, String
    Off.column 'field'+i, String

  suite.add 'modify on', ->
    record = new On()
    for j in [0...100]
      for i in [0...30]
        record['field'+i] = j

  suite.add 'modify off', ->
    record = new Off()
    for j in [0...100]
      for i in [0...30]
        record['field'+i] = j

  suite.add 'update on', (deferred) ->
    On.create sample, (error, record) ->
      return suite.abort() if error
      async.timesSeries 100, (i, callback) ->
        record.field0 = i
        record.save (error) ->
          callback error
      , (error) ->
        return suite.abort() if error
        deferred.resolve()
  , defer: true

  suite.add 'update off', (deferred) ->
    Off.create sample, (error, record) ->
      return suite.abort() if error
      async.timesSeries 100, (i, callback) ->
        record.field0 = i
        record.save (error) ->
          callback error
      , (error) ->
        return suite.abort() if error
        deferred.resolve()
  , defer: true

  suite.on 'cycle', (event) ->
    console.log event.target.toString()

  suite.on 'complete', ->
    callback null

  On.drop (error) ->
    return callback error if error
    Off.drop (error) ->
      return callback error if error
      connection.applySchemas (error) ->
        return callback error if error
        suite.run()
, (error) ->
  console.log error if error
  process.exit()

