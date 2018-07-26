_g = require '../support/common'
{expect} = require 'chai'

_compareUser = (user, expected) ->
  expect(user).to.have.keys 'id', 'name', 'age'
  expect(user.name).to.equal expected.name
  expect(user.age).to.equal expected.age

_createUsers = (User, data) ->
  if not data
    data = [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
      { name: 'Alice Jackson', age: 27 }
      { name: 'Gina Baker', age: 32 }
      { name: 'Daniel Smith', age: 8 }
    ]
  data.sort -> 0.5 - Math.random() # random sort
  await User.createBulk data

module.exports = () ->
  it 'update all', ->
    await _createUsers _g.connection.User
    count = await _g.connection.User.update age: 10
    expect(count).to.equal 5
    users = await _g.connection.User.where()
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Alice Jackson', age: 10
    _compareUser users[1], name: 'Bill Smith', age: 10
    _compareUser users[2], name: 'Daniel Smith', age: 10
    _compareUser users[3], name: 'Gina Baker', age: 10
    _compareUser users[4], name: 'John Doe', age: 10
    return

  it 'update condition', ->
    await _createUsers _g.connection.User
    count = await _g.connection.User.update { age: 10 }, age: 27
    expect(count).to.equal 2
    users = await _g.connection.User.where()
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Alice Jackson', age: 10
    _compareUser users[1], name: 'Bill Smith', age: 45
    _compareUser users[2], name: 'Daniel Smith', age: 8
    _compareUser users[3], name: 'Gina Baker', age: 32
    _compareUser users[4], name: 'John Doe', age: 10
    return

  it 'find & update', ->
    users = await _createUsers _g.connection.User
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    count = await _g.connection.User.find(users[2].id).update age: 10
    expect(count).to.equal 1
    users = await _g.connection.User.where()
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Alice Jackson', age: 27
    _compareUser users[1], name: 'Bill Smith', age: 45
    _compareUser users[2], name: 'Daniel Smith', age: 10
    _compareUser users[3], name: 'Gina Baker', age: 32
    _compareUser users[4], name: 'John Doe', age: 27
    return

  it 'find multiple & update', ->
    users = await _createUsers _g.connection.User
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    count = await _g.connection.User.find([users[2].id, users[3].id]).update age: 10
    expect(count).to.equal 2
    users = await _g.connection.User.where()
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Alice Jackson', age: 27
    _compareUser users[1], name: 'Bill Smith', age: 45
    _compareUser users[2], name: 'Daniel Smith', age: 10
    _compareUser users[3], name: 'Gina Baker', age: 10
    _compareUser users[4], name: 'John Doe', age: 27
    return

  it 'find undefined & update', ->
    await _createUsers _g.connection.User
    count = await _g.connection.User.find(undefined).update age: 10
    expect(count).to.equal 0
    users = await _g.connection.User.where()
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Alice Jackson', age: 27
    _compareUser users[1], name: 'Bill Smith', age: 45
    _compareUser users[2], name: 'Daniel Smith', age: 8
    _compareUser users[3], name: 'Gina Baker', age: 32
    _compareUser users[4], name: 'John Doe', age: 27
    return

  it 'update to remove a field (set null)', ->
    users = await _createUsers _g.connection.User
    count = await _g.connection.User.find(users[2].id).update age: null
    expect(count).to.equal 1
    user = await _g.connection.User.find users[2].id
    expect(user).to.have.keys 'id', 'name', 'age'
    return

  it '$inc', ->
    users = await _createUsers _g.connection.User
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    count = await _g.connection.User.find(users[2].id).update age: $inc: 4
    expect(count).to.equal 1
    user = await _g.connection.User.find users[2].id
    _compareUser user, name: 'Daniel Smith', age: 12
    return

  it '$inc for non-integer column', ->
    users = await _createUsers _g.connection.User
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    try
      await _g.connection.User.find(users[2].id).update name: $inc: 4
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error.message).to.equal "'name' is not a number type"
    return
