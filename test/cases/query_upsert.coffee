_g = require '../support/common'
{expect} = require 'chai'

_compareUserUnique = (user, expected) ->
  expect(user).to.have.keys 'id', 'name', 'age'
  expect(user.name).to.equal expected.name
  expect(user.age).to.equal expected.age

_createUserUniques = (UserUnique, data) ->
  if not data
    data = [
      { name: 'Alice Jackson', age: 27 }
      { name: 'Bill Smith', age: 45 }
    ]
  await UserUnique.createBulk data

module.exports = () ->
  it 'insert new', ->
    await _createUserUniques _g.connection.UserUnique
    await _g.connection.UserUnique.where(name: 'Elsa Wood').upsert age: 10
    users = await _g.connection.UserUnique.where()
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    expect(users).to.have.length 3
    _compareUserUnique users[0], name: 'Alice Jackson', age: 27
    _compareUserUnique users[1], name: 'Bill Smith', age: 45
    _compareUserUnique users[2], name: 'Elsa Wood', age: 10
    return

  it 'update exist', ->
    await _createUserUniques _g.connection.UserUnique
    await _g.connection.UserUnique.where(name: 'Bill Smith').upsert age: 10
    users = await _g.connection.UserUnique.where()
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    expect(users).to.have.length 2
    _compareUserUnique users[0], name: 'Alice Jackson', age: 27
    _compareUserUnique users[1], name: 'Bill Smith', age: 10
    return

  it '$inc for new', ->
    await _createUserUniques _g.connection.UserUnique
    await _g.connection.UserUnique.where(name: 'Elsa Wood').upsert age: $inc: 4
    users = await _g.connection.UserUnique.where()
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    expect(users).to.have.length 3
    _compareUserUnique users[0], name: 'Alice Jackson', age: 27
    _compareUserUnique users[1], name: 'Bill Smith', age: 45
    _compareUserUnique users[2], name: 'Elsa Wood', age: 4
    return

  it '$inc for exist', ->
    await _createUserUniques _g.connection.UserUnique
    await _g.connection.UserUnique.where(name: 'Bill Smith').upsert age: $inc: 4
    users = await _g.connection.UserUnique.where()
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    expect(users).to.have.length 2
    _compareUserUnique users[0], name: 'Alice Jackson', age: 27
    _compareUserUnique users[1], name: 'Bill Smith', age: 49
    return
