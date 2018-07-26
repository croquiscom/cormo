_g = require '../support/common'
{expect} = require 'chai'

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
  it 'simple', ->
    await _createUsers _g.connection.User
    count = 0
    await new Promise (resolve, reject) ->
      _g.connection.User.where(age: 27).stream()
      .on 'data', (user) ->
        count++
        expect(user).to.be.an.instanceof _g.connection.User
        expect(user).to.have.keys 'id', 'name', 'age'
        expect(user.age).to.eql 27
      .on 'end', ->
        expect(count).to.eql 2
        resolve()
      .on 'error', (error) ->
        reject(error)
    return

  it 'lean option', ->
    await _createUsers _g.connection.User
    count = 0
    await new Promise (resolve, reject) ->
      _g.connection.User.where(age: 27).lean().stream()
      .on 'data', (user) ->
        count++
        expect(user).to.not.be.an.instanceof _g.connection.User
        expect(user).to.have.keys 'id', 'name', 'age'
        expect(user.age).to.eql 27
      .on 'end', ->
        expect(count).to.eql 2
        resolve()
      .on 'error', (error) ->
        reject(error)
    return
