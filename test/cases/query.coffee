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
  it 'simple where', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where age: 27
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Alice Jackson', age: 27
    _compareUser users[1], name: 'John Doe', age: 27
    return

  it 'where chain', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where(age: 27).where(name: 'Alice Jackson')
    expect(users).to.have.length 1
    _compareUser users[0], name: 'Alice Jackson', age: 27
    return

  it 'id', ->
    users = await _createUsers _g.connection.User
    target = users[0]
    users = await _g.connection.User.where { id: target.id }
    expect(users).to.have.length 1
    _compareUser users[0], target
    return

  it 'implicit and', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where age: 27, name: 'Alice Jackson'
    expect(users).to.have.length 1
    _compareUser users[0], name: 'Alice Jackson', age: 27
    return

  it '$or', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where $or: [ { age: 32 }, { name: 'John Doe' } ]
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Gina Baker', age: 32
    _compareUser users[1], name: 'John Doe', age: 27
    return

  it 'comparison', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where [ { age: { $gt: 30 } }, { age: { $lte: 45 } } ]
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Bill Smith', age: 45
    _compareUser users[1], name: 'Gina Baker', age: 32
    return

  it 'contains', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where { name: { $contains: 'smi' } }
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Bill Smith', age: 45
    _compareUser users[1], name: 'Daniel Smith', age: 8
    return

  it 'contains multiple', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where { name: { $contains: ['baker', 'doe'] } }
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Gina Baker', age: 32
    _compareUser users[1], name: 'John Doe', age: 27
    return

  it 'startswith', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where { name: { $startswith: 'd' } }
    expect(users).to.have.length 1
    _compareUser users[0], name: 'Daniel Smith', age: 8
    return

  it 'endswith', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where { name: { $endswith: 'h' } }
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Bill Smith', age: 45
    _compareUser users[1], name: 'Daniel Smith', age: 8
    return

  it '$in', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where age: $in: [ 32, 45, 57 ]
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Bill Smith', age: 45
    _compareUser users[1], name: 'Gina Baker', age: 32
    return

  it '$in for id', ->
    users = await _createUsers _g.connection.User
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    users = await _g.connection.User.where id: $in: [ users[2].id, users[0].id ]
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Alice Jackson', age: 27
    _compareUser users[1], name: 'Daniel Smith', age: 8
    return

  it 'implicit $in', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where age: [ 32, 45, 57 ]
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Bill Smith', age: 45
    _compareUser users[1], name: 'Gina Baker', age: 32
    return

  it '$in with an empty array', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where age: $in: []
    expect(users).to.have.length 0
    return

  it 'basic regular expression', ->
    await _createUsers _g.connection.User
    try
      users = await _g.connection.User.where { name: /smi/ }
      expect(users).to.have.length 2
      users.sort (a, b) -> if a.name < b.name then -1 else 1
      _compareUser users[0], name: 'Bill Smith', age: 45
      _compareUser users[1], name: 'Daniel Smith', age: 8
    catch error
      if error.message is 'regular expression is not supported'
        return
      throw error
    return

  it 'complex regular expression', ->
    await _createUsers _g.connection.User
    try
      users = await _g.connection.User.where { name: /l{2}|n$/ }
      expect(users).to.have.length 2
      users.sort (a, b) -> if a.name < b.name then -1 else 1
      _compareUser users[0], name: 'Alice Jackson', age: 27
      _compareUser users[1], name: 'Bill Smith', age: 45
    catch error
      if error.message is 'regular expression is not supported'
        return
      throw error
    return

  it 'count none', ->
    count = await _g.connection.User.count()
    expect(count).to.equal 0
    return

  it 'count all', ->
    await _createUsers _g.connection.User
    count = await _g.connection.User.count()
    expect(count).to.equal 5
    return

  it 'count condition', ->
    await _createUsers _g.connection.User
    count = await _g.connection.User.count age: 27
    expect(count).to.equal 2
    return

  it 'delete all', ->
    await _createUsers _g.connection.User
    count = await _g.connection.User.delete()
    expect(count).to.equal 5
    users = await _g.connection.User.where()
    expect(users).to.have.length 0
    return

  it 'delete condition', ->
    await _createUsers _g.connection.User
    count = await _g.connection.User.delete age: 27
    expect(count).to.equal 2
    users = await _g.connection.User.where()
    expect(users).to.have.length 3
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Bill Smith', age: 45
    _compareUser users[1], name: 'Daniel Smith', age: 8
    _compareUser users[2], name: 'Gina Baker', age: 32
    return

  it 'limit', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.query()
    expect(users).to.have.length 5
    users = await _g.connection.User.query().limit(3)
    expect(users).to.have.length 3
    users = await _g.connection.User.where(age: { $lt: 40 })
    expect(users).to.have.length 4
    users = await _g.connection.User.where(age: { $lt: 40 }).limit(1)
    expect(users).to.have.length 1
    expect(users[0]).to.have.property 'name'
    if users[0].name is 'Alice Jackson'
      _compareUser users[0], name: 'Alice Jackson', age: 27
    else if users[0].name is 'John Doe'
      _compareUser users[0], name: 'John Doe', age: 27
    else if users[0].name is 'Gina Baker'
      _compareUser users[0], name: 'Gina Baker', age: 32
    else
      _compareUser users[0], name: 'Daniel Smith', age: 8
    return

  it 'one', ->
    await _createUsers _g.connection.User
    user = await _g.connection.User.where(age: { $lt: 40 }).one()
    expect(user).to.have.property 'name'
    if user.name is 'Alice Jackson'
      _compareUser user, name: 'Alice Jackson', age: 27
    else if user.name is 'John Doe'
      _compareUser user, name: 'John Doe', age: 27
    else if user.name is 'Gina Baker'
      _compareUser user, name: 'Gina Baker', age: 32
    else
      _compareUser user, name: 'Daniel Smith', age: 8
    user = await _g.connection.User.where(age: { $lt: 5}).one()
    expect(user).to.not.exist
    return

  it 'skip', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.query().order('age').skip(3)
    expect(users).to.have.length 2
    _compareUser users[0], name: 'Gina Baker', age: 32
    _compareUser users[1], name: 'Bill Smith', age: 45
    users = await _g.connection.User.query().order('age').skip(1).limit(2)
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Alice Jackson', age: 27
    _compareUser users[1], name: 'John Doe', age: 27
    return

  it 'select', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.select()
    expect(users[0]).to.have.keys 'id', 'name', 'age'
    users = await _g.connection.User.select 'name age address'
    expect(users[0]).to.have.keys 'id', 'name', 'age'
    users = await _g.connection.User.select 'name'
    expect(users[0]).to.have.keys 'id', 'name'
    users = await _g.connection.User.select ''
    expect(users[0]).to.have.keys 'id'
    return

  it 'order (string)', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.order 'name'
    expect(users).to.have.length 5
    _compareUser users[0], name: 'Alice Jackson', age: 27
    _compareUser users[1], name: 'Bill Smith', age: 45
    _compareUser users[2], name: 'Daniel Smith', age: 8
    _compareUser users[3], name: 'Gina Baker', age: 32
    _compareUser users[4], name: 'John Doe', age: 27
    users = await _g.connection.User.order '-name'
    expect(users).to.have.length 5
    _compareUser users[0], name: 'John Doe', age: 27
    _compareUser users[1], name: 'Gina Baker', age: 32
    _compareUser users[2], name: 'Daniel Smith', age: 8
    _compareUser users[3], name: 'Bill Smith', age: 45
    _compareUser users[4], name: 'Alice Jackson', age: 27
    return

  it 'order (number)', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.order 'age'
    expect(users).to.have.length 5
    _compareUser users[0], name: 'Daniel Smith', age: 8
    if users[1].name is 'Alice Jackson'
      _compareUser users[1], name: 'Alice Jackson', age: 27
      _compareUser users[2], name: 'John Doe', age: 27
    else
      _compareUser users[1], name: 'John Doe', age: 27
      _compareUser users[2], name: 'Alice Jackson', age: 27
    _compareUser users[3], name: 'Gina Baker', age: 32
    _compareUser users[4], name: 'Bill Smith', age: 45
    users = await _g.connection.User.order '-age'
    expect(users).to.have.length 5
    _compareUser users[0], name: 'Bill Smith', age: 45
    _compareUser users[1], name: 'Gina Baker', age: 32
    if users[2].name is 'Alice Jackson'
      _compareUser users[2], name: 'Alice Jackson', age: 27
      _compareUser users[3], name: 'John Doe', age: 27
    else
      _compareUser users[2], name: 'John Doe', age: 27
      _compareUser users[3], name: 'Alice Jackson', age: 27
    _compareUser users[4], name: 'Daniel Smith', age: 8
    return

  it 'order (complex)', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.order 'age name'
    expect(users).to.have.length 5
    _compareUser users[0], name: 'Daniel Smith', age: 8
    _compareUser users[1], name: 'Alice Jackson', age: 27
    _compareUser users[2], name: 'John Doe', age: 27
    _compareUser users[3], name: 'Gina Baker', age: 32
    _compareUser users[4], name: 'Bill Smith', age: 45
    users = await _g.connection.User.order 'age -name'
    expect(users).to.have.length 5
    _compareUser users[0], name: 'Daniel Smith', age: 8
    _compareUser users[1], name: 'John Doe', age: 27
    _compareUser users[2], name: 'Alice Jackson', age: 27
    _compareUser users[3], name: 'Gina Baker', age: 32
    _compareUser users[4], name: 'Bill Smith', age: 45
    return

  it 'order (id)', ->
    sources = await _createUsers _g.connection.User
    sources.sort (a, b) -> if a.id < b.id then -1 else 1
    users = await _g.connection.User.order 'id'
    expect(users).to.have.length 5
    for i in [0..4]
      _compareUser users[i], sources[i]
    users = await _g.connection.User.order '-id'
    expect(users).to.have.length 5
    for i in [0..4]
      _compareUser users[i], sources[4-i]
    return

  it 'lean option for a single record', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    record = await _g.connection.User.find(user.id).lean()
    expect(record).to.exist
    expect(record).to.not.be.an.instanceof _g.connection.User
    expect(record).to.have.property 'id', user.id
    expect(record).to.have.property 'name', user.name
    expect(record).to.have.property 'age', user.age
    return

  it 'lean option for multiple records', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where(age: 27).lean()
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    expect(users[0]).to.not.be.an.instanceof _g.connection.User
    _compareUser users[0], name: 'Alice Jackson', age: 27
    expect(users[1]).to.not.be.an.instanceof _g.connection.User
    _compareUser users[1], name: 'John Doe', age: 27
    return

  it 'lean option of null value with select', ->
    await _g.connection.User.createBulk [ { name: 'Gina Baker' } ]
    users = await _g.connection.User.select('name age').lean()
    expect(users).to.have.length 1
    expect(users[0]).to.have.keys 'id', 'name', 'age'
    expect(users[0].age).to.be.null
    return

  it 'lean option of null value without select', ->
    await _g.connection.User.createBulk [ { name: 'Gina Baker' } ]
    users = await _g.connection.User.query().lean()
    expect(users).to.have.length 1
    expect(users[0]).to.have.keys 'id', 'name', 'age'
    expect(users[0].age).to.be.null
    return

  it 'id field of lean result can be modified', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    record = await _g.connection.User.find(user.id).lean()
    record.id = 'new id'
    expect(record.id).to.be.equal 'new id'
    return

  it 'cache', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where(age: 27).cache(key: 'user', ttl: 30, refresh: true)
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Alice Jackson', age: 27
    _compareUser users[1], name: 'John Doe', age: 27
    # different conditions, will return cached result
    users = await _g.connection.User.where(age: 8).cache(key: 'user', ttl: 30)
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Alice Jackson', age: 27
    _compareUser users[1], name: 'John Doe', age: 27
    # try ignoring cache
    users = await _g.connection.User.where(age: 8).cache(key: 'user', ttl: 30, refresh: true)
    expect(users).to.have.length 1
    _compareUser users[0], name: 'Daniel Smith', age: 8
    # different conditions, will return cached result
    users = await _g.connection.User.where(age: 32).cache(key: 'user', ttl: 30)
    expect(users).to.have.length 1
    _compareUser users[0], name: 'Daniel Smith', age: 8
    # try after removing cache
    await _g.connection.User.removeCache 'user'
    users = await _g.connection.User.where(age: 32).cache(key: 'user', ttl: 30)
    expect(users).to.have.length 1
    _compareUser users[0], name: 'Gina Baker', age: 32
    return

  it 'comparison on id', ->
    users = await _createUsers _g.connection.User
    users.sort (a, b) -> if a.id < b.id then -1 else 1
    records = await _g.connection.User.where id: $lt: users[2].id
    expect(records).to.have.length 2
    _compareUser users[0], records[0]
    _compareUser users[1], records[1]
    count = await _g.connection.User.count id: $lt: users[2].id
    expect(count).to.equal 2
    return

  it 'find undefined & count', ->
    await _createUsers _g.connection.User
    count = await _g.connection.User.find(undefined).count()
    expect(count).to.equal 0
    return

  it 'find undefined & delete', ->
    await _createUsers _g.connection.User
    count = await _g.connection.User.find(undefined).delete()
    expect(count).to.equal 0
    users = await _g.connection.User.where()
    expect(users).to.have.length 5
    return

  it 'turn on lean option in a Model', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    _g.connection.User.lean_query = true
    record = await _g.connection.User.find(user.id)
    _g.connection.User.lean_query = false
    expect(record).to.exist
    expect(record).to.not.be.an.instanceof _g.connection.User
    expect(record).to.have.property 'id', user.id
    expect(record).to.have.property 'name', user.name
    expect(record).to.have.property 'age', user.age
    return

  it 'turn off lean option for a query', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    _g.connection.User.lean_query = true
    record = await _g.connection.User.find(user.id).lean(false)
    _g.connection.User.lean_query = false
    expect(record).to.exist
    expect(record).to.be.an.instanceof _g.connection.User
    expect(record).to.have.property 'id', user.id
    expect(record).to.have.property 'name', user.name
    expect(record).to.have.property 'age', user.age
    return

  it 'if', ->
    await _createUsers _g.connection.User
    query = (limit) ->
      await _g.connection.User.query()
      .if(limit).limit(1).endif()
      .where(age: 27)
    users = await query false
    expect(users).to.have.length 2
    expect(users[0]).to.have.property 'age', 27
    expect(users[1]).to.have.property 'age', 27
    users = await query true
    expect(users).to.have.length 1
    expect(users[0]).to.have.property 'age', 27
    return

  it 'nested if', ->
    await _createUsers _g.connection.User
    query = (limit) ->
      await _g.connection.User.query()
      .if(limit)
        .if(false).where(name: 'Unknown').endif()
        .limit(1)
      .endif()
      .where(age: 27)
    users = await query false
    expect(users).to.have.length 2
    expect(users[0]).to.have.property 'age', 27
    expect(users[1]).to.have.property 'age', 27
    users = await query true
    expect(users).to.have.length 1
    expect(users[0]).to.have.property 'age', 27
    return

  it 'invalid number', ->
    await _createUsers _g.connection.User
    users = await _g.connection.User.where age: '27a'
    expect(users).to.have.length 0
    return

  it 'invalid number(find)', ->
    users = await _createUsers _g.connection.User
    if typeof users[0].id is 'string'
      return
    try
      await _g.connection.User.find users[0].id+'a'
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error.message).to.equal 'not found'
    return

  it 'invalid number(where id:)', ->
    users = await _createUsers _g.connection.User
    if typeof users[0].id is 'string'
      return
    users = await _g.connection.User.where id: users[0].id+'a'
    expect(users).to.have.length 0
    return

  it 'explain for simple(findById)', ->
    users = await _createUsers _g.connection.User
    result = await _g.connection.User.find(users[0].id).lean().explain()
    expect(result).to.not.eql { id: users[0].id, name: users[0].name, age: users[0].age }
    return

  it 'explain for complex(find)', ->
    await _createUsers _g.connection.User
    result = await _g.connection.User.where(age: 8).lean().explain()
    id = result?[0]?.id
    expect(result).to.not.eql [ { id: id, name: 'Daniel Smith', age: 8 } ]
    return
