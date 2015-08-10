_g = require '../support/common'
async = require 'async'
{expect} = require 'chai'

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
  it 'simple', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      count = 0
      _g.connection.User.where(age: 27).stream()
      .on 'data', (user) ->
        count++
        expect(user).to.be.an.instanceof _g.connection.User
        expect(user).to.have.keys 'id', 'name', 'age'
        expect(user.age).to.eql 27
      .on 'end', ->
        expect(count).to.eql 2
        done null
      .on 'error', (error) ->
        done error

  it 'lean option', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      count = 0
      _g.connection.User.where(age: 27).lean().stream()
      .on 'data', (user) ->
        count++
        expect(user).to.not.be.an.instanceof _g.connection.User
        expect(user).to.have.keys 'id', 'name', 'age'
        expect(user.age).to.eql 27
      .on 'end', ->
        expect(count).to.eql 2
        done null
      .on 'error', (error) ->
        done error
