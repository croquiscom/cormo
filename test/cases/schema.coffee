_g = require '../support/common'
{expect} = require 'chai'

module.exports = () ->
  afterEach ->
    await _g.connection.dropAllModels()
    return

  it 'add index', ->
    class User extends _g.Model
      @column 'name', String
      @column 'age', Number

    # can add same age without unique index
    user1 = await User.create { name: 'John Doe', age: 27 }
    user2 = await User.create { name: 'John Doe', age: 27 }

    await user2.destroy()

    # add unique index
    User.index { age: 1 }, unique: true

    await _g.connection.applySchemas()

    # can not add same age with unique index
    try
      await User.create { name: 'Jone Doe', age: 27 }
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      # 'duplicated email' or 'duplicated'
      expect(error.message).to.match /^duplicated( age)?$/
    return

  it 'applySchemas successes if an index already exist', ->
    class User extends _g.Model
      @index { name: 1, age: 1 }
      @column 'name', String
      @column 'age', Number

    await _g.connection.applySchemas()

    User.column 'address', String

    await _g.connection.applySchemas()
    return

  it 'add column', ->
    class User extends _g.Model
      @column 'name', String
      @column 'age', Number

    await _g.connection.applySchemas()

    User.column 'address', String

    user1 = await User.create { name: 'John Doe', age: 27, address: 'Moon' }

    user2 = await User.find user1.id
    expect(user2).to.have.keys 'id', 'name', 'age', 'address'
    expect(user2.address).to.eql 'Moon'
    return
