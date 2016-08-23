_g = require '../support/common'
{expect} = require 'chai'

_compareUser = (user, expected) ->
  expect(user).to.have.keys 'id', 'name', 'age'
  if expected.name?
    expect(user.name).to.equal expected.name
  if expected.age?
    expect(user.age).to.equal expected.age

_createUsers = (User, data, callback) ->
  if typeof data is 'function'
    callback = data
    data = [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
      { name: 'Alice Jackson' }
      {}
      { age: 8 }
    ]
  data.sort -> 0.5 - Math.random() # random sort
  User.createBulk data, callback
  return

module.exports = () ->
  it 'equal null 1', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: null, (error, users) ->
        return done error if error
        expect(users).to.have.length 2
        if users[0].name?
          [users[0], users[1]] = [users[1], users[0]]
        _compareUser users[0], {}
        _compareUser users[1], name: 'Alice Jackson'
        done null

  it 'equal null 2', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where name: null, (error, users) ->
        return done error if error
        expect(users).to.have.length 2
        if users[0].age?
          [users[0], users[1]] = [users[1], users[0]]
        _compareUser users[0], {}
        _compareUser users[1], age: 8
        done null

  it 'not equal null 1', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: $not: null, (error, users) ->
        return done error if error
        expect(users).to.have.length 3
        users.sort (a, b) -> if a.age < b.age then -1 else 1
        _compareUser users[0], age: 8
        _compareUser users[1], name: 'John Doe', age: 27
        _compareUser users[2], name: 'Bill Smith', age: 45
        done null

  it 'not equal null 2', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where name: $not: null, (error, users) ->
        return done error if error
        expect(users).to.have.length 3
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Alice Jackson'
        _compareUser users[1], name: 'Bill Smith', age: 45
        _compareUser users[2], name: 'John Doe', age: 27
        done null

  it 'null in $or', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where $or: [ {name: $not: null}, {age:null} ], (error, users) ->
        return done error if error
        expect(users).to.have.length 4
        users.sort (a, b) ->
          return -1 if not a.name
          return 1 if not b.name
          if a.name < b.name then -1 else 1
        _compareUser users[0], {}
        _compareUser users[1], name: 'Alice Jackson'
        _compareUser users[2], name: 'Bill Smith', age: 45
        _compareUser users[3], name: 'John Doe', age: 27
        done null
