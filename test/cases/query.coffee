_g = require '../common'
async = require 'async'
{expect} = require 'chai'

_compareUser = (user, expected) ->
  expect(user).to.have.keys 'id', 'name', 'age'
  expect(user.name).to.equal expected.name
  expect(user.age).to.equal expected.age

_createUsers = (User, data, callback) ->
  if typeof data is 'function'
    callback = data
    data = [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
      { name: 'Alice Jackson', age: 27 }
      { name: 'Gina Baker', age: 32 }
      { name: 'Daniel Smith', age: 8 }
    ]
  data.sort -> 0.5 - Math.random() # random sort
  User.createBulk data, callback

module.exports = () ->
  it 'simple where', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: 27, (error, users) ->
        return done error if error
        expect(users).to.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'John Doe', age: 27
        done null

  it 'where chain', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where(age: 27).where(name: 'Alice Jackson').exec (error, users) ->
        return done error if error
        expect(users).to.have.length 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        done null

  it 'id', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      target = users[0]
      return done error if error
      _g.connection.User.where { id: target.id }, (error, users) ->
        return done error if error
        expect(users).to.have.length 1
        _compareUser users[0], target
        done null

  it 'implicit and', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: 27, name: 'Alice Jackson', (error, users) ->
        return done error if error
        expect(users).to.have.length 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        done null

  it '$or', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where $or: [ { age: 32 }, { name: 'John Doe' } ], (error, users) ->
        return done error if error
        expect(users).to.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Gina Baker', age: 32
        _compareUser users[1], name: 'John Doe', age: 27
        done null

  it 'comparison', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where [ { age: { $gt: 30 } }, { age: { $lte: 45 } } ], (error, users) ->
        return done error if error
        expect(users).to.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Gina Baker', age: 32
        done null

  it 'contains', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where { name: { $contains: 'smi' } }, (error, users) ->
        return done error if error
        expect(users).to.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Daniel Smith', age: 8
        done null

  it '$in', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: $in: [ 32, 45, 57 ], (error, users) ->
        return done error if error
        expect(users).to.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Gina Baker', age: 32
        done null

  it '$in for id', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      users.sort (a, b) -> if a.name < b.name then -1 else 1
      _g.connection.User.where id: $in: [ users[2].id, users[0].id ], (error, users) ->
        return done error if error
        expect(users).to.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'Daniel Smith', age: 8
        done null

  it 'implicit $in', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: [ 32, 45, 57 ], (error, users) ->
        return done error if error
        expect(users).to.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Gina Baker', age: 32
        done null

  it '$in with an empty array', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: $in: [], (error, users) ->
        return done error if error
        expect(users).to.have.length 0
        done null

  it 'count none', (done) ->
    _g.connection.User.count (error, count) ->
      expect(count).to.equal 0
      done null

  it 'count all', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.count (error, count) ->
        expect(count).to.equal 5
        done null

  it 'count condition', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.count age: 27, (error, count) ->
        expect(count).to.equal 2
        done null

  it 'delete all', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.delete (error, count) ->
        expect(count).to.equal 5
        _g.connection.User.where (error, users) ->
          return done error if error
          expect(users).to.have.length 0
          done null

  it 'delete condition', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.delete age: 27, (error, count) ->
        expect(count).to.equal 2
        _g.connection.User.where (error, users) ->
          return done error if error
          expect(users).to.have.length 3
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          _compareUser users[0], name: 'Bill Smith', age: 45
          _compareUser users[1], name: 'Daniel Smith', age: 8
          _compareUser users[2], name: 'Gina Baker', age: 32
          done null

  it 'limit', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      async.series [
        (callback) ->
          _g.connection.User.query().exec (error, users) ->
            return callback error if error
            expect(users).to.have.length 5
            callback null
        (callback) ->
          _g.connection.User.query().limit(3).exec (error, users) ->
            return callback error if error
            expect(users).to.have.length 3
            callback null
        (callback) ->
          _g.connection.User.where(age: { $lt: 40 }).exec (error, users) ->
            return callback error if error
            expect(users).to.have.length 4
            callback null
        (callback) ->
          _g.connection.User.where(age: { $lt: 40 }).limit(1).exec (error, users) ->
            return callback error if error
            expect(users).to.have.length 1
            expect(users[0]).to.have.property 'name'
            if users[0].name is 'Alice Jackson'
              _compareUser users[0], name: 'Alice Jackson', age: 27
            else if users[0].name is 'John Doe'
              _compareUser users[0], name: 'John Doe', age: 27
            else if users[0].name is 'Gina Baker'
              _compareUser users[0], name: 'Gina Baker', age: 32
            else
              _compareUser users[0], name: 'Daniel Smith', age: 8
            callback null
      ], (error) ->
        done error

  it 'one', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      async.series [
        (callback) ->
          _g.connection.User.where(age: { $lt: 40 }).one().exec (error, user) ->
            return callback error if error
            expect(user).to.have.property 'name'
            if user.name is 'Alice Jackson'
              _compareUser user, name: 'Alice Jackson', age: 27
            else if user.name is 'John Doe'
              _compareUser user, name: 'John Doe', age: 27
            else if user.name is 'Gina Baker'
              _compareUser user, name: 'Gina Baker', age: 32
            else
              _compareUser user, name: 'Daniel Smith', age: 8
            callback null
        (callback) ->
          _g.connection.User.where(age: { $lt: 5}).one().exec (error, user) ->
            expect(user).to.not.exist
            callback null
      ], (error) ->
        done error

  it 'skip', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      async.series [
        (callback) ->
          _g.connection.User.query().order('age').skip(3).exec (error, users) ->
            return callback error if error
            expect(users).to.have.length 2
            _compareUser users[0], name: 'Gina Baker', age: 32
            _compareUser users[1], name: 'Bill Smith', age: 45
            callback null
        (callback) ->
          _g.connection.User.query().order('age').skip(1).limit(2).exec (error, users) ->
            return callback error if error
            expect(users).to.have.length 2
            users.sort (a, b) -> if a.name < b.name then -1 else 1
            _compareUser users[0], name: 'Alice Jackson', age: 27
            _compareUser users[1], name: 'John Doe', age: 27
            callback null
      ], done

  it 'select', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      async.series [
        (callback) ->
          _g.connection.User.select (error, users) ->
            return callback error if error
            expect(users[0]).to.have.keys 'id', 'name', 'age'
            callback null
        (callback) ->
          _g.connection.User.select 'name age address', (error, users) ->
            return callback error if error
            expect(users[0]).to.have.keys 'id', 'name', 'age'
            callback null
        (callback) ->
          _g.connection.User.select 'name', (error, users) ->
            return callback error if error
            expect(users[0]).to.have.keys 'id', 'name'
            callback null
        (callback) ->
          _g.connection.User.select '', (error, users) ->
            return callback error if error
            expect(users[0]).to.have.keys 'id'
            callback null
      ], (error) ->
        done error

  it 'order (string)', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.order 'name', (error, users) ->
        return done error if error
        expect(users).to.have.length 5
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'Bill Smith', age: 45
        _compareUser users[2], name: 'Daniel Smith', age: 8
        _compareUser users[3], name: 'Gina Baker', age: 32
        _compareUser users[4], name: 'John Doe', age: 27
        _g.connection.User.order '-name', (error, users) ->
          return done error if error
          expect(users).to.have.length 5
          _compareUser users[0], name: 'John Doe', age: 27
          _compareUser users[1], name: 'Gina Baker', age: 32
          _compareUser users[2], name: 'Daniel Smith', age: 8
          _compareUser users[3], name: 'Bill Smith', age: 45
          _compareUser users[4], name: 'Alice Jackson', age: 27
          done null

  it 'order (number)', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.order 'age', (error, users) ->
        return done error if error
        expect(users).to.have.length 5
        _compareUser users[0], name: 'Daniel Smith', age: 8
        if users[1].name is 'Alice Jackson'
          _compareUser users[1], name: 'Alice Jackson', age: 27
          _compareUser users[2], name: 'John Doe', age: 27
        else
          _compareUser users[1], name: 'John Doe', age: 27
          _compareUser users[2], name: 'Alice Jackson', age: 27
        _compareUser users[3], name: 'Gina Baker', age: 32
        _compareUser users[4], name: 'Bill Smith', age: 45
        _g.connection.User.order '-age', (error, users) ->
          return done error if error
          expect(users).to.have.length 5
          _compareUser users[0], name: 'Bill Smith', age: 45
          _compareUser users[1], name: 'Gina Baker', age: 32
          if users[2].name is 'Alice Jackson'
            _compareUser users[2], name: 'Alice Jackson', age: 27
            _compareUser users[3], name: 'John Doe', age: 27
          else
            _compareUser users[2], name: 'John Doe', age: 27
            _compareUser users[3], name: 'Alice Jackson', age: 27
          _compareUser users[4], name: 'Daniel Smith', age: 8
          done null

  it 'order (complex)', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.order 'age name', (error, users) ->
        return done error if error
        expect(users).to.have.length 5
        _compareUser users[0], name: 'Daniel Smith', age: 8
        _compareUser users[1], name: 'Alice Jackson', age: 27
        _compareUser users[2], name: 'John Doe', age: 27
        _compareUser users[3], name: 'Gina Baker', age: 32
        _compareUser users[4], name: 'Bill Smith', age: 45
        _g.connection.User.order 'age -name', (error, users) ->
          return done error if error
          expect(users).to.have.length 5
          _compareUser users[0], name: 'Daniel Smith', age: 8
          _compareUser users[1], name: 'John Doe', age: 27
          _compareUser users[2], name: 'Alice Jackson', age: 27
          _compareUser users[3], name: 'Gina Baker', age: 32
          _compareUser users[4], name: 'Bill Smith', age: 45
          done null

  it 'order (id)', (done) ->
    _createUsers _g.connection.User, (error, sources) ->
      return done error if error
      sources.sort (a, b) -> if a.id < b.id then -1 else 1
      _g.connection.User.order 'id', (error, users) ->
        return done error if error
        expect(users).to.have.length 5
        for i in [0..4]
          _compareUser users[i], sources[i]
        _g.connection.User.order '-id', (error, users) ->
          return done error if error
          expect(users).to.have.length 5
          for i in [0..4]
            _compareUser users[i], sources[4-i]
          done null

  it 'lean option for a single record', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      _g.connection.User.find(user.id).lean().exec (error, record) ->
        return done error if error
        expect(record).to.exist
        expect(record).to.not.be.an.instanceof _g.connection.User
        expect(record).to.have.property 'id', user.id
        expect(record).to.have.property 'name', user.name
        expect(record).to.have.property 'age', user.age
        done null

  it 'lean option for multiple records', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where(age: 27).lean().exec (error, users) ->
        return done error if error
        expect(users).to.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        expect(users[0]).to.not.be.an.instanceof _g.connection.User
        _compareUser users[0], name: 'Alice Jackson', age: 27
        expect(users[1]).to.not.be.an.instanceof _g.connection.User
        _compareUser users[1], name: 'John Doe', age: 27
        done null

  it 'lean option of null value with select', (done) ->
    _g.connection.User.createBulk [ { name: 'Gina Baker' } ], (error, users) ->
      return done error if error
      _g.connection.User.select('name age').lean().exec (error, users) ->
        return done error if error
        expect(users).to.have.length 1
        expect(users[0]).to.have.keys 'id', 'name', 'age'
        expect(users[0].age).to.be.null
        done null

  it 'lean option of null value without select', (done) ->
    _g.connection.User.createBulk [ { name: 'Gina Baker' } ], (error, users) ->
      return done error if error
      _g.connection.User.query().lean().exec (error, users) ->
        return done error if error
        expect(users).to.have.length 1
        expect(users[0]).to.have.keys 'id', 'name', 'age'
        expect(users[0].age).to.be.null
        done null

  it 'id field of lean result can be modified', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      _g.connection.User.find(user.id).lean().exec (error, record) ->
        return done error if error
        record.id = 'new id'
        expect(record.id).to.be.equal 'new id'
        done null

  it 'cache', (done) ->
    async.waterfall [
      (callback) ->
        _createUsers _g.connection.User, callback
      (users, callback) ->
        _g.connection.User.where(age: 27).cache(key: 'user', ttl: 30, refresh: true).exec callback
      (users, callback) ->
        expect(users).to.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'John Doe', age: 27
        callback null
      (callback) ->
        # different conditions, will return cached result
        _g.connection.User.where(age: 8).cache(key: 'user', ttl: 30).exec callback
      (users, callback) ->
        expect(users).to.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'John Doe', age: 27
        callback null
      (callback) ->
        # try ignoring cache
        _g.connection.User.where(age: 8).cache(key: 'user', ttl: 30, refresh: true).exec callback
      (users, callback) ->
        expect(users).to.have.length 1
        _compareUser users[0], name: 'Daniel Smith', age: 8
        callback null
      (callback) ->
        # different conditions, will return cached result
        _g.connection.User.where(age: 32).cache(key: 'user', ttl: 30).exec callback
      (users, callback) ->
        expect(users).to.have.length 1
        _compareUser users[0], name: 'Daniel Smith', age: 8
        callback null
      # try after removing cache
      (callback) ->
        _g.connection.User.removeCache 'user', (error) ->
          callback error
      (callback) ->
        _g.connection.User.where(age: 32).cache(key: 'user', ttl: 30).exec callback
      (users, callback) ->
        expect(users).to.have.length 1
        _compareUser users[0], name: 'Gina Baker', age: 32
        callback null
    ], done

  it 'comparison on id', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      users.sort (a, b) -> if a.id < b.id then -1 else 1
      _g.connection.User.where id: $lt: users[2].id, (error, records) ->
        return done error if error
        expect(records).to.have.length 2
        _compareUser users[0], records[0]
        _compareUser users[1], records[1]
        _g.connection.User.count id: $lt: users[2].id, (error, count) ->
          return done error if error
          expect(count).to.equal 2
          done null

  it 'find undefined & count', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.find(undefined).count (error, count) ->
        expect(count).to.equal 0
        done null

  it 'find undefined & delete', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.find(undefined).delete (error, count) ->
        expect(count).to.equal 0
        _g.connection.User.where (error, users) ->
          return done error if error
          expect(users).to.have.length 5
          done null

  it 'turn on lean option in a Model', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      _g.connection.User.lean_query = true
      _g.connection.User.find(user.id).exec (error, record) ->
        _g.connection.User.lean_query = false
        return done error if error
        expect(record).to.exist
        expect(record).to.not.be.an.instanceof _g.connection.User
        expect(record).to.have.property 'id', user.id
        expect(record).to.have.property 'name', user.name
        expect(record).to.have.property 'age', user.age
        done null

  it 'turn off lean option for a query', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      _g.connection.User.lean_query = true
      _g.connection.User.find(user.id).lean(false).exec (error, record) ->
        _g.connection.User.lean_query = false
        return done error if error
        expect(record).to.exist
        expect(record).to.be.an.instanceof _g.connection.User
        expect(record).to.have.property 'id', user.id
        expect(record).to.have.property 'name', user.name
        expect(record).to.have.property 'age', user.age
        done null

  it 'if', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      query = (limit, callback) ->
        _g.connection.User.query()
        .if(limit).limit(1).endif()
        .where(age: 27)
        .exec callback
      async.series [
        (callback) ->
          query false, (error, users) ->
            return callback error if error
            expect(users).to.have.length 2
            expect(users[0]).to.have.property 'age', 27
            expect(users[1]).to.have.property 'age', 27
            callback null
        (callback) ->
          query true, (error, users) ->
            return callback error if error
            expect(users).to.have.length 1
            expect(users[0]).to.have.property 'age', 27
            callback null
      ], (error) ->
        done error

  it 'nested if', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      query = (limit, callback) ->
        _g.connection.User.query()
        .if(limit)
          .if(false).where(name: 'Unknown').endif()
          .limit(1)
        .endif()
        .where(age: 27)
        .exec callback
      async.series [
        (callback) ->
          query false, (error, users) ->
            return callback error if error
            expect(users).to.have.length 2
            expect(users[0]).to.have.property 'age', 27
            expect(users[1]).to.have.property 'age', 27
            callback null
        (callback) ->
          query true, (error, users) ->
            return callback error if error
            expect(users).to.have.length 1
            expect(users[0]).to.have.property 'age', 27
            callback null
      ], (error) ->
        done error

  it 'invalid number', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: '27a', (error, users) ->
        return done error if error
        expect(users).to.have.length 0
        done null

  it 'invalid number(find)', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      return done null if typeof users[0].id is 'string'
      _g.connection.User.find users[0].id+'a', (error, user) ->
        expect(error).to.exist
        expect(error.message).to.equal 'not found'
        done null

  it 'invalid number(where id:)', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      return done null if typeof users[0].id is 'string'
      _g.connection.User.where id: users[0].id+'a', (error, users) ->
        return done error if error
        expect(users).to.have.length 0
        done null

  it 'explain for simple(findById)', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.find(users[0].id).lean().explain (error, result) ->
        return done error if error
        expect(result).to.not.eql { id: users[0].id, name: users[0].name, age: users[0].age }
        done null

  it 'explain for complex(find)', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where(age: 8).lean().explain (error, result) ->
        return done error if error
        id = result?[0]?.id
        expect(result).to.not.eql [ { id: id, name: 'Daniel Smith', age: 8 } ]
        done null
