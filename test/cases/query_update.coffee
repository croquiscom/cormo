_g = require '../common'
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
  it 'update all', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.update age: 10, (error, count) ->
        return done error if error
        expect(count).to.equal 5
        _g.connection.User.where (error, users) ->
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          _compareUser users[0], name: 'Alice Jackson', age: 10
          _compareUser users[1], name: 'Bill Smith', age: 10
          _compareUser users[2], name: 'Daniel Smith', age: 10
          _compareUser users[3], name: 'Gina Baker', age: 10
          _compareUser users[4], name: 'John Doe', age: 10
          done null

  it 'update condition', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.update { age: 10 }, age: 27, (error, count) ->
        return done error if error
        expect(count).to.equal 2
        _g.connection.User.where (error, users) ->
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          _compareUser users[0], name: 'Alice Jackson', age: 10
          _compareUser users[1], name: 'Bill Smith', age: 45
          _compareUser users[2], name: 'Daniel Smith', age: 8
          _compareUser users[3], name: 'Gina Baker', age: 32
          _compareUser users[4], name: 'John Doe', age: 10
          done null

  it 'find & update', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      users.sort (a, b) -> if a.name < b.name then -1 else 1
      return done error if error
      _g.connection.User.find(users[2].id).update age: 10, (error, count) ->
        return done error if error
        expect(count).to.equal 1
        _g.connection.User.where (error, users) ->
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          _compareUser users[0], name: 'Alice Jackson', age: 27
          _compareUser users[1], name: 'Bill Smith', age: 45
          _compareUser users[2], name: 'Daniel Smith', age: 10
          _compareUser users[3], name: 'Gina Baker', age: 32
          _compareUser users[4], name: 'John Doe', age: 27
          done null

  it 'find multiple & update', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      users.sort (a, b) -> if a.name < b.name then -1 else 1
      return done error if error
      _g.connection.User.find([users[2].id, users[3].id]).update age: 10, (error, count) ->
        return done error if error
        expect(count).to.equal 2
        _g.connection.User.where (error, users) ->
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          _compareUser users[0], name: 'Alice Jackson', age: 27
          _compareUser users[1], name: 'Bill Smith', age: 45
          _compareUser users[2], name: 'Daniel Smith', age: 10
          _compareUser users[3], name: 'Gina Baker', age: 10
          _compareUser users[4], name: 'John Doe', age: 27
          done null

  it 'find undefined & update', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      users.sort (a, b) -> if a.name < b.name then -1 else 1
      return done error if error
      _g.connection.User.find(undefined).update age: 10, (error, count) ->
        return done error if error
        expect(count).to.equal 0
        _g.connection.User.where (error, users) ->
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          _compareUser users[0], name: 'Alice Jackson', age: 27
          _compareUser users[1], name: 'Bill Smith', age: 45
          _compareUser users[2], name: 'Daniel Smith', age: 8
          _compareUser users[3], name: 'Gina Baker', age: 32
          _compareUser users[4], name: 'John Doe', age: 27
          done null

  it 'update to remove a field (set null)', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.find(users[2].id).update age: null, (error, count) ->
        return done error if error
        expect(count).to.equal 1
        _g.connection.User.find users[2].id, (error, user) ->
          expect(user).to.have.keys 'id', 'name', 'age'
          done null

  it '$inc', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      users.sort (a, b) -> if a.name < b.name then -1 else 1
      return done error if error
      _g.connection.User.find(users[2].id).update age: $inc: 4, (error, count) ->
        return done error if error
        expect(count).to.equal 1
        _g.connection.User.find users[2].id, (error, user) ->
          _compareUser user, name: 'Daniel Smith', age: 12
          done null

  it '$inc for non-integer column', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      users.sort (a, b) -> if a.name < b.name then -1 else 1
      return done error if error
      _g.connection.User.find(users[2].id).update name: $inc: 4, (error, count) ->
        expect(error).to.exist
        expect(error.message).to.equal "'name' is not a number type"
        return done null
