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

async.forEachSeries Object.keys(_dbs), (db, callback) ->
  console.log '>>> Begin ' + db

  suite = new Benchmark.Suite()
  global.connection = new Connection db, _dbs[db]
  class User extends Model
    @column 'name', String
    @column 'age', Number
  class Post extends Model
    @column 'title', String
    @column 'date', Date
    @column 'read_count', cormo.types.Integer
    @belongsTo 'user'

  suite.add 'find', (deferred) ->
    async.times 100, (i, callback) ->
      User.where(age: $gt: 10).where(age: $lt: 20).exec (error, users) ->
        return callback error if error
        return callback 'find error' if users.length isnt 9
        callback null
    , (error) ->
      return suite.abort() if error
      deferred.resolve()
  , defer: true

  suite.add 'find with lean option', (deferred) ->
    async.times 100, (i, callback) ->
      User.where(age: $gt: 10).where(age: $lt: 20).lean().exec (error, users) ->
        return callback error if error
        return callback 'find error' if users.length isnt 9
        callback null
    , (error) ->
      return suite.abort() if error
      deferred.resolve()
  , defer: true

  switch db
    when 'mongodb'
      suite.add 'find native', (deferred) ->
        async.times 100, (i, callback) ->
          connection._adapter._collection('User').find $and: [ { age: $gt: 10 }, { age: $lt: 20 } ], (error, cursor) ->
            return callback error if error
            cursor.toArray (error, users) ->
              return callback error if error
              return callback 'find error' if users.length isnt 9
              users.forEach (user) ->
                user.id = user._id.toString()
                delete user._id
              callback null
        , (error) ->
          return suite.abort() if error
          deferred.resolve()
      , defer: true
    when 'mysql'
      suite.add 'find native', (deferred) ->
        async.times 100, (i, callback) ->
          connection._adapter._query 'SELECT * from users WHERE age > ? AND age < ?', [10,20], (error, users) ->
            return callback error if error
            return callback 'find error' if users.length isnt 9
            callback null
        , (error) ->
          return suite.abort() if error
          deferred.resolve()
      , defer: true
    when 'sqlite3'
      suite.add 'find native', (deferred) ->
        async.times 100, (i, callback) ->
          connection._adapter._query 'all', 'SELECT * from users WHERE age > ? AND age < ?', [10,20], (error, users) ->
            return callback error if error
            return callback 'find error' if users.length isnt 9
            callback null
        , (error) ->
          return suite.abort() if error
          deferred.resolve()
      , defer: true
    when 'postgresql'
      suite.add 'find native', (deferred) ->
        async.times 100, (i, callback) ->
          connection._adapter._query 'SELECT * from users WHERE age > $1 AND age < $2', [10,20], (error, result) ->
            return callback error if error
            users = result.rows
            return callback 'find error' if users.length isnt 9
            callback null
        , (error) ->
          return suite.abort() if error
          deferred.resolve()
      , defer: true

  suite.on 'cycle', (event) ->
    console.log event.target.toString()

  suite.on 'complete', ->
    callback null

  async.waterfall [
    (callback) -> User.drop callback
    (callback) -> Post.drop callback
    (callback) -> connection.applySchemas callback
    (callback) ->
      bulkUserData = [0...100].map (i) -> name: 'name'+i, age: i
      User.createBulk bulkUserData, callback
    (users, callback) ->
      callback null
  ], (error) ->
    return callback error if error
    suite.run()
, (error) ->
  console.log error if error
  process.exit()
