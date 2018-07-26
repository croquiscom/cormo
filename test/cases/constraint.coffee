_g = require '../support/common'
{expect} = require 'chai'

_createUsers = (User, data) ->
  if not data
    data = [
      { name: 'John Doe', age: 27, email: 'john.doe@example.com', facebook_id: '1' }
      { name: 'Bill Smith', age: 45, email: 'bill@foo.org', facebook_id: '2' }
      { name: 'Alice Jackson', age: 27, email: 'ceo@wonderful.com', facebook_id: '3' }
      { name: 'Gina Baker', age: 32, email: 'gina@example.com', facebook_id: '4' }
    ]
  return await User.createBulk data

module.exports = () ->
  it 'unique', ->
    users = await _createUsers _g.connection.User
    try
      user = await _g.connection.User.create { name: 'Bill Simpson', age: 38, email: 'bill@foo.org' }
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      # 'duplicated email' or 'duplicated'
      expect(error.message).to.match /^duplicated( email)?$/
      expect(user).to.not.exist
    return

  it 'check uniqueness on update by Model::save', ->
    users = await _createUsers _g.connection.User
    users[0].email = 'bill@foo.org'
    try
      await users[0].save()
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      # 'duplicated email' or 'duplicated'
      expect(error.message).to.match /^duplicated( email)?$/
    return

  it 'check uniqueness on update by Model.update', ->
    users = await _createUsers _g.connection.User
    try
      await _g.connection.User.find(users[0].id).update email: 'bill@foo.org'
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      # 'duplicated email' or 'duplicated'
      expect(error.message).to.match /^duplicated( email)?$/
    return

  it 'required', ->
    try
      await _g.connection.User.create { age: 10, email: 'test1@example.com' }
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error.message).to.equal "'name' is required"

    try
      await _g.connection.User.create { name: 'test', email: 'test2@example.com' }
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error.message).to.equal "'age' is required"

    try
      await _g.connection.User.create { name: 'test', age: 10 }
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error.message).to.equal "'email' is required"

    return

  it 'unique but not required', ->
    # There can be two null values
    # ( MongoDB can have an index unique but not sparse )
    await _g.connection.User.create { name: 'test', age: 10, email: 'test1@example.com' }
    await _g.connection.User.create { name: 'test', age: 10, email: 'test2@example.com' }
    return

  it 'required on update by Model::save', ->
    users = await _createUsers _g.connection.User
    users[0].name = null
    try
      await users[0].save()
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error.message).to.equal "'name' is required"
    return

  it 'required on update by Model.update', ->
    users = await _createUsers _g.connection.User
    try
      await _g.connection.User.find(users[0].id).update name: null
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error.message).to.equal "'name' is required"
    return

  it 'required of belongsTo', ->
    user = await _g.connection.User.create { name: 'Bill Simpson', age: 38, email: 'bill@foo.org' }
    try
      await _g.connection.Post.create { title: 'first post', body: 'This is the 1st post.' }
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error.message).to.equal "'user_id' is required"
    await _g.connection.Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }
    return
