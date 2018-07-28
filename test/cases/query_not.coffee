_g = require '../support/common'
{expect} = require 'chai'

_compareUser = (user, expected) ->
  if expected.age?
    expect(user).to.have.keys 'id', 'name', 'age'
    expect(user.age).to.equal expected.age
  else
    expect(user).to.have.keys 'id', 'name', 'age'
  expect(user.name).to.equal expected.name

_createUsers = (User, data) ->
  if not data
    data = [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
      { name: 'Alice Jackson', age: 27 }
      { name: 'Gina Baker' }
      { name: 'Daniel Smith', age: 8 }
    ]
  data.sort -> 0.5 - Math.random() # random sort
  await User.createBulk data

module.exports = () ->
  it 'simple not', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where age: $not: 27
    expect(users).to.have.length 3
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Bill Smith', age: 45
    _compareUser users[1], name: 'Daniel Smith', age: 8
    _compareUser users[2], name: 'Gina Baker'
    return

  it 'where not chain', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where(age: $not: 27).where(name: $not: 'Daniel Smith')
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Bill Smith', age: 45
    _compareUser users[1], name: 'Gina Baker'
    return

  it 'not for id', ->
    users = await _createUsers _g.connection.User
    target = users[0]
    users = await _g.connection.User.where { id: $not: target.id }
    expect(users).to.have.length 4
    return

  it 'not for comparison', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where age: $gt: 30
    expect(users).to.have.length 1
    _compareUser users[0], name: 'Bill Smith', age: 45
    # '> 30' != 'not < 30' because of null value
    users = await _g.connection.User.where age: $not: $lt: 30
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Bill Smith', age: 45
    _compareUser users[1], name: 'Gina Baker'
    return

  it 'not contains', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where name: $not: $contains: 'smi'
    expect(users).to.have.length 3
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Alice Jackson', age: 27
    _compareUser users[1], name: 'Gina Baker'
    _compareUser users[2], name: 'John Doe', age: 27
    return

  it 'not contains multiple', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where name: $not: $contains: ['baker', 'doe']
    expect(users).to.have.length 3
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Alice Jackson', age: 27
    _compareUser users[1], name: 'Bill Smith', age: 45
    _compareUser users[2], name: 'Daniel Smith', age: 8
    return

  it 'not startswith', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where name: $not: $startswith: 'd'
    expect(users).to.have.length 4
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Alice Jackson', age: 27
    _compareUser users[1], name: 'Bill Smith', age: 45
    _compareUser users[2], name: 'Gina Baker'
    _compareUser users[3], name: 'John Doe', age: 27
    return

  it 'not endswith', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where name: $not: $endswith: 'h'
    expect(users).to.have.length 3
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Alice Jackson', age: 27
    _compareUser users[1], name: 'Gina Baker'
    _compareUser users[2], name: 'John Doe', age: 27
    return

  it 'not $in', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where age: $not: $in: [ 27, 45, 57 ]
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Daniel Smith', age: 8
    _compareUser users[1], name: 'Gina Baker'
    return

  it 'not $in for id', ->
    users = await _createUsers _g.connection.User
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    users = await _g.connection.User.where id: $not: $in: [ users[2].id, users[0].id ]
    expect(users).to.have.length 3
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Bill Smith', age: 45
    _compareUser users[1], name: 'Gina Baker'
    _compareUser users[2], name: 'John Doe', age: 27
    return

  it 'not for implicit $in', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where age: $not: [ 27, 45, 57 ]
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Daniel Smith', age: 8
    _compareUser users[1], name: 'Gina Baker'
    return
