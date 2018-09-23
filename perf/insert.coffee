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

  switch db
    when 'mongodb'
      suite.add 'insert 100 parallel native', (deferred) ->
        async.times 100, (i, callback) ->
          user = name: 'name'+i, age: i
          connection._adapter._collection('User').insert user, safe: true, (error, result) ->
            return callback error if error
            user.id = user._id.toString()
            delete user._id
            callback null
        , (error) ->
          return suite.abort() if error
          deferred.resolve()
      , defer: true
    when 'mysql'
      suite.add 'insert 100 parallel native', (deferred) ->
        async.times 100, (i, callback) ->
          user = name: 'name'+i, age: i
          connection._adapter._query 'INSERT INTO users (name,age) VALUES (?,?)', [user.name, user.age], (error, result) ->
            return callback error if error
            user.id = result.insertId
            callback null
        , (error) ->
          return suite.abort() if error
          deferred.resolve()
      , defer: true
    when 'sqlite3'
      suite.add 'insert 100 parallel native', (deferred) ->
        async.times 100, (i, callback) ->
          user = name: 'name'+i, age: i
          connection._adapter._query 'run', 'INSERT INTO users (name,age) VALUES (?,?)', [user.name, user.age], (error) ->
            return callback error if error
            user.id = @lastID
            callback null
        , (error) ->
          return suite.abort() if error
          deferred.resolve()
      , defer: true
    when 'postgresql'
      suite.add 'insert 100 parallel native', (deferred) ->
        async.times 100, (i, callback) ->
          user = name: 'name'+i, age: i
          connection._adapter._query 'INSERT INTO users (name,age) VALUES ($1,$2) RETURNING id', [user.name, user.age], (error, result) ->
            return callback error if error
            user.id = result.rows[0].id
            callback null
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
