_g = require '../support/common'
{expect} = require 'chai'

_getInvalidID = (id) ->
  if typeof id is 'number'
    # MySQL
    return -1
  else if typeof id is 'string'
    # MongoDB
    return id.replace /./, '9'
  else
    throw new Error 'no support'

module.exports = () ->
  it 'create one', ->
    user = new _g.connection.User()
    user.name = 'John Doe'
    user.age = 27
    expect(user).to.have.property 'name', 'John Doe'
    expect(user).to.have.property 'age', 27
    return

  it 'initialize in constructor', ->
    user = new _g.connection.User name: 'John Doe', age: 27
    expect(user).to.have.property 'name', 'John Doe'
    expect(user).to.have.property 'age', 27
    return

  it 'build method', ->
    user = _g.connection.User.build name: 'John Doe', age: 27
    expect(user).to.have.property 'name', 'John Doe'
    expect(user).to.have.property 'age', 27
    return

  it 'add a new record to the database', ->
    user = new _g.connection.User name: 'John Doe', age: 27
    await user.save()
    expect(user).to.have.keys 'id', 'name', 'age'
    return

  it 'create method', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    expect(user).to.be.an.instanceof _g.connection.User
    expect(user).to.have.keys 'id', 'name', 'age'
    expect(user.id).to.exist
    return

  it 'find a record', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    record = await _g.connection.User.find user.id
    expect(record).to.exist
    expect(record).to.be.an.instanceof _g.connection.User
    expect(record).to.have.property 'id', user.id
    expect(record).to.have.property 'name', user.name
    expect(record).to.have.property 'age', user.age
    return

  it 'find non-existing record', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    id = _getInvalidID user.id
    try
      await _g.connection.User.find id
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error).to.be.an.instanceof Error
      expect(error.message).to.equal 'not found'
    return

  it 'find undefined', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    try
      await _g.connection.User.find undefined
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error).to.be.an.instanceof Error
      expect(error.message).to.equal 'not found'
    return

  it 'find undefined with condition', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    try
      await _g.connection.User.find(undefined).where(age: $gt: 0)
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error).to.be.an.instanceof Error
      expect(error.message).to.equal 'not found'
    return

  it 'update a record', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    user.name = 'Bill Smith'
    record = await _g.connection.User.find user.id
    # not yet saved, you will get previous values
    expect(record).to.exist
    expect(record).to.have.property 'id', user.id
    expect(record).to.have.property 'name', 'John Doe'
    expect(record).to.have.property 'age', 27
    await user.save()
    record = await _g.connection.User.find user.id
    expect(record).to.exist
    expect(record).to.have.property 'id', user.id
    expect(record).to.have.property 'name', 'Bill Smith'
    expect(record).to.have.property 'age', 27
    return

  it 'destroy a record', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    record = await _g.connection.User.find user.id
    expect(record).to.exist
    expect(record).to.have.property 'id', user.id
    expect(record).to.have.property 'name', 'John Doe'
    expect(record).to.have.property 'age', 27
    await user.destroy()
    try
      await _g.connection.User.find user.id
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error).to.be.an.instanceof Error
      expect(error.message).to.equal 'not found'
    return

  it 'destroy a new record', ->
    user = _g.connection.User.build name: 'John Doe', age: 27
    await user.destroy()
    return

  it 'try to create with extra data', ->
    user = new _g.connection.User { id: 1, name: 'John Doe', age: 27, extra: 'extra' }
    expect(user).to.have.property 'id', null
    expect(user).to.not.have.property 'extra'
    user.id = 1
    expect(user).to.have.property 'id', null # id is read only
    user.extra = 'extra'
    expect(user).to.have.property 'extra', 'extra'
    record = await user.save()
    expect(user).to.equal record
    expect(user).to.have.property 'extra', 'extra'
    record = await _g.connection.User.find user.id
    expect(record).to.have.property 'id', user.id
    expect(record).to.have.property 'name', user.name
    expect(record).to.have.property 'age', user.age
    expect(record).to.not.have.property 'extra'
    return

  it 'delete some fields', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    user.name = null
    user.age = null
    record = await user.save()
    expect(user).to.equal record
    record = await _g.connection.User.find user.id
    expect(record).to.have.keys 'id', 'name', 'age'
    expect(record).to.have.property 'name', null
    expect(record).to.have.property 'age', null
    return

  it 'find records', ->
    users = await Promise.all [
      _g.connection.User.create { name: 'John Doe', age: 27 }
      _g.connection.User.create { name: 'Bill Smith', age: 45 }
      _g.connection.User.create { name: 'Alice Jackson', age: 27 }
    ]
    users.sort (a, b) -> if a.id < b.id then -1 else 1
    records = await _g.connection.User.find [users[0].id, users[1].id]
    records.sort (a, b) -> if a.id < b.id then -1 else 1
    expect(records[0]).to.be.an.instanceof _g.connection.User
    expect(records[1]).to.be.an.instanceof _g.connection.User
    expect(records[0]).to.eql users[0]
    expect(records[1]).to.eql users[1]
    return

  it 'find records with non-existing id', ->
    users = await Promise.all [
      _g.connection.User.create { name: 'John Doe', age: 27 }
      _g.connection.User.create { name: 'Bill Smith', age: 45 }
      _g.connection.User.create { name: 'Alice Jackson', age: 27 }
    ]
    users.sort (a, b) -> if a.id < b.id then -1 else 1
    try
      await _g.connection.User.find [users[2].id, users[1].id, _getInvalidID(users[0].id)]
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error).to.be.an.instanceof Error
      expect(error.message).to.equal 'not found'
    return

  it 'find records duplicate', ->
    users = await Promise.all [
      _g.connection.User.create { name: 'John Doe', age: 27 }
      _g.connection.User.create { name: 'Bill Smith', age: 45 }
      _g.connection.User.create { name: 'Alice Jackson', age: 27 }
    ]
    users.sort (a, b) -> if a.id < b.id then -1 else 1
    records = await _g.connection.User.find [users[2].id, users[0].id, users[0].id, users[0].id, users[2].id]
    records.sort (a, b) -> if a.id < b.id then -1 else 1
    expect(records[0]).to.be.an.instanceof _g.connection.User
    expect(records[1]).to.be.an.instanceof _g.connection.User
    expect(records[0]).to.eql users[0]
    expect(records[1]).to.eql users[2]
    return

  it 'find while preserving order', ->
    users = await Promise.all [
      _g.connection.User.create { name: 'John Doe', age: 27 }
      _g.connection.User.create { name: 'Bill Smith', age: 45 }
      _g.connection.User.create { name: 'Alice Jackson', age: 27 }
    ]
    records = await _g.connection.User.findPreserve [users[2].id, users[0].id, users[0].id, users[0].id, users[2].id]
    expect(records).to.have.length 5
    expect(records[0]).to.eql users[2]
    expect(records[1]).to.eql users[0]
    expect(records[2]).to.eql users[0]
    expect(records[3]).to.eql users[0]
    expect(records[4]).to.eql users[2]
    return

  it 'createBulk', ->
    data = [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
      { name: 'Alice Jackson', age: 27 }
    ]
    users = await _g.connection.User.createBulk data
    expect(users).to.exist
    expect(users).to.be.an.instanceof Array
    expect(users).to.have.length 3
    for user in users
      expect(user).to.be.an.instanceof _g.connection.User
      expect(user).to.have.keys 'id', 'name', 'age'
      expect(user.id).to.exist
      record = await _g.connection.User.find user.id
      expect(user).to.eql record
    return

  it 'dirty', ->
    if not _g.connection.User.dirty_tracking
      return
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    expect(user.isDirty()).to.equal false
    expect(user.getChanged()).to.eql []
    expect(user.getPrevious('name')).to.not.exist

    user.name = 'Bill Smith'
    expect(user.isDirty()).to.equal true
    expect(user.getChanged()).to.eql ['name']
    expect(user.getPrevious('name')).to.equal 'John Doe'

    user.name = 'Alice Jackson'
    expect(user.isDirty()).to.equal true
    expect(user.getChanged()).to.eql ['name']
    expect(user.getPrevious('name')).to.equal 'John Doe'

    user.age = 10
    expect(user.isDirty()).to.equal true
    expect(user.getChanged().sort()).to.eql ['age','name']
    expect(user.getPrevious('name')).to.equal 'John Doe'
    expect(user.getPrevious('age')).to.equal 27

    user.reset()
    expect(user.name).to.equal 'John Doe'
    expect(user.age).to.equal 27
    expect(user.isDirty()).to.equal false
    expect(user.getChanged()).to.eql []
    expect(user.getPrevious('name')).to.not.exist

    return

  it 'dirty after save', ->
    if not _g.connection.User.dirty_tracking
      return
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    user.name = 'Bill Smith'
    expect(user.isDirty()).to.equal true
    expect(user.getChanged()).to.eql ['name']
    await user.save()
    expect(user.isDirty()).to.equal false
    expect(user.getChanged()).to.eql []
    return

  it 'get & set', ->
    user = new _g.connection.User name: 'John Doe', age: 27
    expect(user.get('name')).to.equal 'John Doe'
    expect(user.get('age')).to.equal 27
    user.set 'name', 'Bill Smith'
    expect(user.get('name')).to.equal 'Bill Smith'
    return
