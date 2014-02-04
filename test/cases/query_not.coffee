{expect} = require 'chai'

_compareUser = (user, expected) ->
  if expected.age?
    expect(user).to.have.keys 'id', 'name', 'age'
    expect(user.age).to.equal expected.age
  else if user.constructor.eliminate_null
    expect(user).to.have.keys 'id', 'name'
  else
    expect(user).to.have.keys 'id', 'name', 'age'
  expect(user.name).to.equal expected.name

_createUsers = (User, data, callback) ->
  if typeof data is 'function'
    callback = data
    data = [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
      { name: 'Alice Jackson', age: 27 }
      { name: 'Gina Baker' }
      { name: 'Daniel Smith', age: 8 }
    ]
  data.sort -> 0.5 - Math.random() # random sort
  User.createBulk data, callback

module.exports = () ->
  it 'simple not', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: $not: 27, (error, users) ->
        return done error if error
        expect(users).to.have.length 3
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Daniel Smith', age: 8
        _compareUser users[2], name: 'Gina Baker'
        done null

  it 'where not chain', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where(age: $not: 27).where(name: $not: 'Daniel Smith').exec (error, users) ->
        return done error if error
        expect(users).to.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Gina Baker'
        done null

  it 'not for id', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      target = users[0]
      return done error if error
      _g.connection.User.where { id: $not: target.id }, (error, users) ->
        return done error if error
        expect(users).to.have.length 4
        done null

  it 'not for comparison', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: $gt: 30, (error, users) ->
        return done error if error
        expect(users).to.have.length 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        # '> 30' != 'not < 30' because of null value
        _g.connection.User.where age: $not: $lt: 30, (error, users) ->
          return done error if error
          expect(users).to.have.length 2
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          _compareUser users[0], name: 'Bill Smith', age: 45
          _compareUser users[1], name: 'Gina Baker'
          done null

  it 'not contains', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where name: $not: $contains: 'smi', (error, users) ->
        return done error if error
        expect(users).to.have.length 3
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'Gina Baker'
        _compareUser users[2], name: 'John Doe', age: 27
        done null

  it 'not $in', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: $not: $in: [ 27, 45, 57 ], (error, users) ->
        return done error if error
        expect(users).to.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Daniel Smith', age: 8
        _compareUser users[1], name: 'Gina Baker'
        done null

  it 'not $in for id', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      users.sort (a, b) -> if a.name < b.name then -1 else 1
      _g.connection.User.where id: $not: $in: [ users[2].id, users[0].id ], (error, users) ->
        return done error if error
        expect(users).to.have.length 3
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Gina Baker'
        _compareUser users[2], name: 'John Doe', age: 27
        done null

  it 'not for implicit $in', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: $not: [ 27, 45, 57 ], (error, users) ->
        return done error if error
        expect(users).to.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Daniel Smith', age: 8
        _compareUser users[1], name: 'Gina Baker'
        done null
