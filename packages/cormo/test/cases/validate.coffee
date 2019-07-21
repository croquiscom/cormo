_g = require '../support/common'
{expect} = require 'chai'

module.exports = () ->
  it 'valid', ->
    await _g.connection.User.create { name: 'John Doe', age: 27 }
    return

  it 'invalid age', ->
    try
      await _g.connection.User.create { name: 'John Doe', age: 10 }
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error.message).to.equal 'too young'
    return

  it 'invalid email', ->
    try
      await _g.connection.User.create { name: 'John Doe', age: 27, email: 'invalid' }
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error.message).to.equal 'invalid email'
    return

  it 'invalid both', ->
    try
      await _g.connection.User.create { name: 'John Doe', age: 10, email: 'invalid' }
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      if error.message isnt 'invalid email,too young'
        expect(error.message).to.equal 'too young,invalid email'
    return

  it 'validation bug $inc: 0', ->
    if not _g.connection.adapter.support_upsert
      return
    await _g.connection.User.where(name: 'John Doe').upsert age: $inc: 0
    return
