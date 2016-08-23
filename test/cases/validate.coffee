_g = require '../support/common'
{expect} = require 'chai'

module.exports = () ->
  it 'valid', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      done null
    return

  it 'invalid age', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 10 }, (error, user) ->
      expect(error).to.exist
      expect(error.message).to.equal 'too young'
      done null
    return

  it 'invalid email', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27, email: 'invalid' }, (error, user) ->
      expect(error).to.exist
      expect(error.message).to.equal 'invalid email'
      done null
    return

  it 'invalid both', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 10, email: 'invalid' }, (error, user) ->
      expect(error).to.exist
      if error.message isnt 'invalid email,too young'
        expect(error.message).to.equal 'too young,invalid email'
      done null
    return

  it 'validation bug $inc: 0', (done) ->
    if not _g.connection.adapter.support_upsert
      return done null
    _g.connection.User.where(name: 'John Doe').upsert age: $inc: 0, (error, user) ->
      return done error if error
      done null
    return
