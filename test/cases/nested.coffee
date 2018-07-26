_g = require '../support/common'
{expect} = require 'chai'

module.exports = () ->
  it 'define a model, create an instance and fetch it', ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    user = await User.create { name: first: 'John', last: 'Doe' }
    expect(user).to.have.keys 'id', 'name'
    expect(user.name).to.have.keys 'first', 'last'
    expect(user.name.first).to.eql 'John'
    expect(user.name.last).to.eql 'Doe'
    user = await User.find user.id
    expect(user).to.have.keys 'id', 'name'
    expect(user.name).to.have.keys 'first', 'last'
    expect(user.name.first).to.eql 'John'
    expect(user.name.last).to.eql 'Doe'
    return

  it 'get a record whose super column is null', ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    user = await User.create {}
    user = await User.find user.id
    expect(user).to.have.keys 'id', 'name'
    expect(user.name).to.be.null
    return

  it 'another style to define a model', ->
    User = _g.connection.User

    User.column 'name.first', String
    User.column 'name.last', String

    user = await User.create { name: first: 'John', last: 'Doe' }
    expect(user).to.have.keys 'id', 'name'
    expect(user.name).to.have.keys 'first', 'last'
    expect(user.name.first).to.eql 'John'
    expect(user.name.last).to.eql 'Doe'
    user = await User.find user.id
    expect(user).to.have.keys 'id', 'name'
    expect(user.name).to.have.keys 'first', 'last'
    expect(user.name.first).to.eql 'John'
    expect(user.name.last).to.eql 'Doe'
    return

  it 'constraint', ->
    User = _g.connection.User

    User.column 'name',
      first: { type: String, required: true }
      middle: String
      last: { type: String, required: true }

    user = await User.create { name: first: 'John', middle: 'F.', last: 'Doe' }
    user = await User.find user.id
    expect(user).to.have.keys 'id', 'name'
    expect(user.name).to.have.keys 'first', 'middle', 'last'
    expect(user.name.first).to.eql 'John'
    expect(user.name.middle).to.eql 'F.'
    expect(user.name.last).to.eql 'Doe'
    # missing non-required field
    user = await User.create { name: first: 'John', last: 'Doe' }
    user = await User.find user.id
    expect(user).to.have.keys 'id', 'name'
    expect(user.name).to.have.keys 'first', 'middle', 'last'
    expect(user.name.first).to.eql 'John'
    expect(user.name.middle).to.null
    expect(user.name.last).to.eql 'Doe'
    # missing required field
    try
      await User.create { name: first: 'John', middle: 'F.' }
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error).to.have.property 'message', "'name.last' is required"
    return

  it 'query', ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    await User.create { name: first: 'John', last: 'Doe' }
    await User.create { name: first: 'Bill', last: 'Smith' }
    await User.create { name: first: 'Daniel', last: 'Smith' }
    users = await User.where { 'name.last': 'Smith' }
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name.first < b.name.first then -1 else 1
    expect(users[0]).to.have.keys 'id', 'name'
    expect(users[0].name).to.have.keys 'first', 'last'
    expect(users[0].name.first).to.eql 'Bill'
    expect(users[0].name.last).to.eql 'Smith'
    expect(users[1]).to.have.keys 'id', 'name'
    expect(users[1].name).to.have.keys 'first', 'last'
    expect(users[1].name.first).to.eql 'Daniel'
    expect(users[1].name.last).to.eql 'Smith'
    return

  it 'update', ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    user = await User.create { name: first: 'John', last: 'Doe' }
    count = await User.find(user.id).update name: first: 'Bill'
    expect(count).to.equal 1
    user = await User.find user.id
    expect(user).to.have.keys 'id', 'name'
    expect(user.name).to.have.keys 'first', 'last'
    expect(user.name.first).to.eql 'Bill'
    expect(user.name.last).to.eql 'Doe'
    return

  it 'constraint on update', ->
    User = _g.connection.User

    User.column 'name',
      first: { type: String, required: true }
      middle: String
      last: { type: String, required: true }

    user = await User.create { name: first: 'John', middle: 'F.', last: 'Doe' }
    try
      await User.find(user.id).update name: last: null
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error).to.have.property 'message', "'name.last' is required"
    return

  it 'keys on empty', ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String
    User.column 'age', Number

    user = await User.create name: { first: 'John', last: 'Doe' }, age: 20
    expect(user).to.have.keys 'id', 'name', 'age'
    user = await User.create age: 20
    expect(user).to.have.keys 'id', 'name', 'age'
    expect(user.name).to.null
    return

  it 'replace object', ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    user = await User.create name: { first: 'John', last: 'Doe' }
    user.name = first: 'Bill'
    expect(user.name.first).to.equal 'Bill'
    await user.save()
    user = await User.find user.id
    expect(user).to.have.keys 'id', 'name'
    expect(user.name).to.have.keys 'first', 'last'
    expect(user.name.first).to.eql 'Bill'
    expect(user.name.last).to.be.null
    return

  it 'get & set', ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    user = new User name: first: 'John', last: 'Doe'
    expect(user.get('name.first')).to.equal 'John'
    expect(user.get('name.last')).to.equal 'Doe'
    user.set 'name.first', 'Bill'
    expect(user.get('name.first')).to.equal 'Bill'
    expect(user.get('name.last')).to.equal 'Doe'
    user.set 'name', first: 'John'
    expect(user.get('name.first')).to.equal 'John'
    expect(user.get('name.last')).to.not.exist

    return

  it 'select sub', ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    await User.create { name: first: 'John', last: 'Doe' }
    users = await User.select 'name.first'
    expect(users).to.have.length 1
    expect(users[0]).to.have.keys 'id', 'name'
    expect(users[0].name).to.have.keys 'first'
    expect(users[0].name.first).to.eql 'John'
    return

  it 'select super', ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    await User.create { name: first: 'John', last: 'Doe' }
    users = await User.select 'name'
    expect(users).to.have.length 1
    expect(users[0]).to.have.keys 'id', 'name'
    expect(users[0].name).to.have.keys 'first', 'last'
    expect(users[0].name.first).to.eql 'John'
    expect(users[0].name.last).to.eql 'Doe'
    return

  it 'update super null', ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    user = await User.create { name: first: 'John', last: 'Doe' }
    count = await User.find(user.id).update name: null
    expect(count).to.equal 1
    user = await User.find user.id
    expect(user).to.have.keys 'id', 'name'
    expect(user.name).to.be.null
    return

  it 'lean option', ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    await User.create { name: first: 'John', last: 'Doe' }
    users = await User.select('name').lean()
    expect(users).to.have.length 1
    expect(users[0]).to.have.keys 'id', 'name'
    expect(users[0].name).to.have.keys 'first', 'last'
    expect(users[0].name.first).to.eql 'John'
    expect(users[0].name.last).to.eql 'Doe'
    return

  it 'select for null fields', ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    await User.create {}
    # select sub
    users = await User.select 'name.first'
    expect(users).to.have.length 1
    expect(users[0]).to.have.keys 'id', 'name'
    expect(users[0].name).to.eql first: null
    # select super
    users = await User.select 'name'
    expect(users).to.have.length 1
    expect(users[0]).to.have.keys 'id', 'name'
    expect(users[0].name).to.be.null
    # select sub with lean
    users = await User.select('name.first').lean()
    expect(users).to.have.length 1
    expect(users[0]).to.have.keys 'id', 'name'
    expect(users[0].name).to.eql first: null
    # select super with lean
    users = await User.select('name').lean()
    expect(users).to.have.length 1
    expect(users[0]).to.have.keys 'id', 'name'
    expect(users[0].name).to.be.null
    return

  it 'order', ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    await User.create { name: first: 'John', last: 'Doe' }
    await User.create { name: first: 'Bill', last: 'Smith' }
    await User.create { name: first: 'Alice', last: 'Jackson' }
    await User.create { name: first: 'Gina', last: 'Baker' }
    await User.create { name: first: 'Daniel', last: 'Smith' }
    users = await User.where().order('name.first')
    expect(users).to.have.length 5
    expect(users[0]).to.have.keys 'id', 'name'
    expect(users[0].name).to.have.keys 'first', 'last'
    expect(users[0].name.first).to.eql 'Alice'
    expect(users[0].name.last).to.eql 'Jackson'
    expect(users[1]).to.have.keys 'id', 'name'
    expect(users[1].name).to.have.keys 'first', 'last'
    expect(users[1].name.first).to.eql 'Bill'
    expect(users[1].name.last).to.eql 'Smith'
    return
