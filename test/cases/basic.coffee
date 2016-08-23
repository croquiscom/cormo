_g = require '../support/common'
async = require 'async'
{expect} = require 'chai'

_getInvalidID = (id) ->
  if typeof id is 'number'
    # MySQL
    return -1
  else if typeof id is 'string'
    # MongoDB
    return id.replace /./, '9'
  else
    throw new Error 'no support'

module.exports = () ->
  it 'create one', (done) ->
    user = new _g.connection.User()
    user.name = 'John Doe'
    user.age = 27
    expect(user).to.have.property 'name', 'John Doe'
    expect(user).to.have.property 'age', 27
    done null

  it 'initialize in constructor', (done) ->
    user = new _g.connection.User name: 'John Doe', age: 27
    expect(user).to.have.property 'name', 'John Doe'
    expect(user).to.have.property 'age', 27
    done null

  it 'build method', (done) ->
    user = _g.connection.User.build name: 'John Doe', age: 27
    expect(user).to.have.property 'name', 'John Doe'
    expect(user).to.have.property 'age', 27
    done null

  it 'add a new record to the database', (done) ->
    user = new _g.connection.User name: 'John Doe', age: 27
    user.save (error) ->
      return done error if error
      expect(user).to.have.keys 'id', 'name', 'age'
      done null
    return

  it 'create method', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      expect(user).to.be.an.instanceof _g.connection.User
      expect(user).to.have.keys 'id', 'name', 'age'
      expect(user.id).to.exist
      done null
    return

  it 'find a record', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      _g.connection.User.find user.id, (error, record) ->
        return done error if error
        expect(record).to.exist
        expect(record).to.be.an.instanceof _g.connection.User
        expect(record).to.have.property 'id', user.id
        expect(record).to.have.property 'name', user.name
        expect(record).to.have.property 'age', user.age
        done null
    return

  it 'find non-existing record', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      id = _getInvalidID user.id
      _g.connection.User.find id, (error) ->
        expect(error).to.exist
        expect(error).to.be.an.instanceof Error
        expect(error.message).to.equal 'not found'
        done null
    return

  it 'find undefined', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      _g.connection.User.find undefined, (error) ->
        expect(error).to.exist
        expect(error).to.be.an.instanceof Error
        expect(error.message).to.equal 'not found'
        done null
    return

  it 'find undefined with condition', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      _g.connection.User.find(undefined).where(age: $gt: 0).exec (error) ->
        expect(error).to.exist
        expect(error).to.be.an.instanceof Error
        expect(error.message).to.equal 'not found'
        done null
    return

  it 'update a record', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      user.name = 'Bill Smith'
      _g.connection.User.find user.id, (error, record) ->
        # not yet saved, you will get previous values
        return done error if error
        expect(record).to.exist
        expect(record).to.have.property 'id', user.id
        expect(record).to.have.property 'name', 'John Doe'
        expect(record).to.have.property 'age', 27
        user.save (error) ->
          return done error if error
          _g.connection.User.find user.id, (error, record) ->
            return done error if error
            expect(record).to.exist
            expect(record).to.have.property 'id', user.id
            expect(record).to.have.property 'name', 'Bill Smith'
            expect(record).to.have.property 'age', 27
            done null
    return

  it 'destroy a record', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      _g.connection.User.find user.id, (error, record) ->
        return done error if error
        expect(record).to.exist
        expect(record).to.have.property 'id', user.id
        expect(record).to.have.property 'name', 'John Doe'
        expect(record).to.have.property 'age', 27
        user.destroy (error) ->
          return done error if error
          _g.connection.User.find user.id, (error, record) ->
            expect(error).to.exist
            expect(error).to.be.an.instanceof Error
            expect(error.message).to.equal 'not found'
            done null
    return

  it 'destroy a new record', (done) ->
    user = _g.connection.User.build name: 'John Doe', age: 27
    user.destroy (error) ->
      return done error if error
      done null
    return

  it 'try to create with extra data', (done) ->
    user = new _g.connection.User { id: 1, name: 'John Doe', age: 27, extra: 'extra' }
    expect(user).to.have.property 'id', null
    expect(user).to.not.have.property 'extra'
    user.id = 1
    expect(user).to.have.property 'id', null # id is read only
    user.extra = 'extra'
    expect(user).to.have.property 'extra', 'extra'
    user.save (error, record) ->
      return done error if error
      expect(user).to.equal record
      expect(user).to.have.property 'extra', 'extra'
      _g.connection.User.find user.id, (error, record) ->
        return done error if error
        expect(record).to.have.property 'id', user.id
        expect(record).to.have.property 'name', user.name
        expect(record).to.have.property 'age', user.age
        expect(record).to.not.have.property 'extra'
        done null
    return

  it 'delete some fields', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      user.name = null
      user.age = null
      user.save (error, record) ->
        return done error if error
        expect(user).to.equal record
        _g.connection.User.find user.id, (error, record) ->
          return done error if error
          expect(record).to.have.keys 'id', 'name', 'age'
          expect(record).to.have.property 'name', null
          expect(record).to.have.property 'age', null
          done null
    return

  it 'find records', (done) ->
    async.parallel [
      (callback) -> _g.connection.User.create { name: 'John Doe', age: 27 }, callback
      (callback) -> _g.connection.User.create { name: 'Bill Smith', age: 45 }, callback
      (callback) -> _g.connection.User.create { name: 'Alice Jackson', age: 27 }, callback
    ], (error, users) ->
      return done error if error
      users.sort (a, b) -> if a.id < b.id then -1 else 1
      async.waterfall [
        (callback) -> _g.connection.User.find [users[0].id, users[1].id], callback
        (records, callback) ->
          records.sort (a, b) -> if a.id < b.id then -1 else 1
          expect(records[0]).to.be.an.instanceof _g.connection.User
          expect(records[1]).to.be.an.instanceof _g.connection.User
          expect(records[0]).to.eql users[0]
          expect(records[1]).to.eql users[1]
          callback null
      ], (error) ->
        return done error if error
        done null

  it 'find records with non-existing id', (done) ->
    async.parallel [
      (callback) -> _g.connection.User.create { name: 'John Doe', age: 27 }, callback
      (callback) -> _g.connection.User.create { name: 'Bill Smith', age: 45 }, callback
      (callback) -> _g.connection.User.create { name: 'Alice Jackson', age: 27 }, callback
    ], (error, users) ->
      return done error if error
      users.sort (a, b) -> if a.id < b.id then -1 else 1
      _g.connection.User.find [users[2].id, users[1].id, _getInvalidID(users[0].id)], (error, records) ->
        expect(error).to.exist
        expect(error).to.be.an.instanceof Error
        expect(error.message).to.equal 'not found'
        done null

  it 'find records duplicate', (done) ->
    async.parallel [
      (callback) -> _g.connection.User.create { name: 'John Doe', age: 27 }, callback
      (callback) -> _g.connection.User.create { name: 'Bill Smith', age: 45 }, callback
      (callback) -> _g.connection.User.create { name: 'Alice Jackson', age: 27 }, callback
    ], (error, users) ->
      return done error if error
      users.sort (a, b) -> if a.id < b.id then -1 else 1
      async.waterfall [
        (callback) -> _g.connection.User.find [users[2].id, users[0].id, users[0].id, users[0].id, users[2].id], callback
        (records, callback) ->
          records.sort (a, b) -> if a.id < b.id then -1 else 1
          expect(records[0]).to.be.an.instanceof _g.connection.User
          expect(records[1]).to.be.an.instanceof _g.connection.User
          expect(records[0]).to.eql users[0]
          expect(records[1]).to.eql users[2]
          callback null
      ], (error) ->
        return done error if error
        done null

  it 'find while preserving order', (done) ->
    async.parallel [
      (callback) -> _g.connection.User.create { name: 'John Doe', age: 27 }, callback
      (callback) -> _g.connection.User.create { name: 'Bill Smith', age: 45 }, callback
      (callback) -> _g.connection.User.create { name: 'Alice Jackson', age: 27 }, callback
    ], (error, users) ->
      return done error if error
      async.waterfall [
        (callback) -> _g.connection.User.findPreserve [users[2].id, users[0].id, users[0].id, users[0].id, users[2].id], callback
        (records, callback) ->
          expect(records).to.have.length 5
          expect(records[0]).to.eql users[2]
          expect(records[1]).to.eql users[0]
          expect(records[2]).to.eql users[0]
          expect(records[3]).to.eql users[0]
          expect(records[4]).to.eql users[2]
          callback null
      ], (error) ->
        return done error if error
        done null

  it 'createBulk', (done) ->
    data = [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
      { name: 'Alice Jackson', age: 27 }
    ]
    _g.connection.User.createBulk data, (error, users) ->
      return done error if error
      expect(users).to.exist
      expect(users).to.be.an.instanceof Array
      expect(users).to.have.length 3
      async.forEach users, (user, callback) ->
        expect(user).to.be.an.instanceof _g.connection.User
        expect(user).to.have.keys 'id', 'name', 'age'
        expect(user.id).to.exist
        _g.connection.User.find user.id, (error, record) ->
          return callback error if error
          expect(user).to.eql record
          callback error
      , done
    return

  it 'dirty', (done) ->
    return done null if not _g.connection.User.dirty_tracking
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error

      expect(user.isDirty()).to.equal false
      expect(user.getChanged()).to.eql []
      expect(user.getPrevious('name')).to.not.exist

      user.name = 'Bill Smith'
      expect(user.isDirty()).to.equal true
      expect(user.getChanged()).to.eql ['name']
      expect(user.getPrevious('name')).to.equal 'John Doe'

      user.name = 'Alice Jackson'
      expect(user.isDirty()).to.equal true
      expect(user.getChanged()).to.eql ['name']
      expect(user.getPrevious('name')).to.equal 'John Doe'

      user.age = 10
      expect(user.isDirty()).to.equal true
      expect(user.getChanged().sort()).to.eql ['age','name']
      expect(user.getPrevious('name')).to.equal 'John Doe'
      expect(user.getPrevious('age')).to.equal 27

      user.reset()
      expect(user.name).to.equal 'John Doe'
      expect(user.age).to.equal 27
      expect(user.isDirty()).to.equal false
      expect(user.getChanged()).to.eql []
      expect(user.getPrevious('name')).to.not.exist

      done null
    return

  it 'dirty after save', (done) ->
    return done null if not _g.connection.User.dirty_tracking
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      user.name = 'Bill Smith'
      expect(user.isDirty()).to.equal true
      expect(user.getChanged()).to.eql ['name']
      user.save (error) ->
        return done error if error
        expect(user.isDirty()).to.equal false
        expect(user.getChanged()).to.eql []
        done null
    return

  it 'get & set', (done) ->
    user = new _g.connection.User name: 'John Doe', age: 27
    expect(user.get('name')).to.equal 'John Doe'
    expect(user.get('age')).to.equal 27
    user.set 'name', 'Bill Smith'
    expect(user.get('name')).to.equal 'Bill Smith'
    done null
