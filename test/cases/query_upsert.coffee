_g = require '../support/common'
{expect} = require 'chai'

_compareUser = (user, expected) ->
  expect(user).to.have.keys 'id', 'name', 'age'
  expect(user.name).to.equal expected.name
  expect(user.age).to.equal expected.age

_createUsers = (User, data, callback) ->
  if typeof data is 'function'
    callback = data
    data = [
      { name: 'Alice Jackson', age: 27 }
      { name: 'Bill Smith', age: 45 }
    ]
  User.createBulk data, callback

module.exports = () ->
  it 'insert new', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where(name: 'Elsa Wood').upsert age: 10, (error) ->
        return done error if error
        _g.connection.User.where (error, users) ->
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          expect(users).to.have.length 3
          _compareUser users[0], name: 'Alice Jackson', age: 27
          _compareUser users[1], name: 'Bill Smith', age: 45
          _compareUser users[2], name: 'Elsa Wood', age: 10
          done null

  it 'update exist', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where(name: 'Bill Smith').upsert age: 10, (error) ->
        return done error if error
        _g.connection.User.where (error, users) ->
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          expect(users).to.have.length 2
          _compareUser users[0], name: 'Alice Jackson', age: 27
          _compareUser users[1], name: 'Bill Smith', age: 10
          done null

  it '$inc for new', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where(name: 'Elsa Wood').upsert age: $inc: 4, (error) ->
        return done error if error
        _g.connection.User.where (error, users) ->
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          expect(users).to.have.length 3
          _compareUser users[0], name: 'Alice Jackson', age: 27
          _compareUser users[1], name: 'Bill Smith', age: 45
          _compareUser users[2], name: 'Elsa Wood', age: 4
          done null

  it '$inc for exist', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where(name: 'Bill Smith').upsert age: $inc: 4, (error) ->
        return done error if error
        _g.connection.User.where (error, users) ->
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          expect(users).to.have.length 2
          _compareUser users[0], name: 'Alice Jackson', age: 27
          _compareUser users[1], name: 'Bill Smith', age: 49
          done null
