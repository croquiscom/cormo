_g = require '../support/common'
async = require 'async'
{expect} = require 'chai'

module.exports = () ->
  it 'define a model, create an instance and fetch it', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    async.waterfall [
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) ->
        expect(user).to.have.keys 'id', 'name'
        expect(user.name).to.have.keys 'first', 'last'
        expect(user.name.first).to.eql 'John'
        expect(user.name.last).to.eql 'Doe'
        callback null, user.id
      (id, callback) -> User.find id, callback
      (user, callback) ->
        expect(user).to.have.keys 'id', 'name'
        expect(user.name).to.have.keys 'first', 'last'
        expect(user.name.first).to.eql 'John'
        expect(user.name.last).to.eql 'Doe'
        callback null
    ], done

  it 'get a record whose super column is null', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    async.waterfall [
      (callback) -> User.create {}, callback
      (user, callback) -> User.find user.id, callback
      (user, callback) ->
        expect(user).to.have.keys 'id', 'name'
        expect(user.name).to.be.null
        callback null
    ], done

  it 'another style to define a model', (done) ->
    User = _g.connection.User

    User.column 'name.first', String
    User.column 'name.last', String

    async.waterfall [
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) ->
        expect(user).to.have.keys 'id', 'name'
        expect(user.name).to.have.keys 'first', 'last'
        expect(user.name.first).to.eql 'John'
        expect(user.name.last).to.eql 'Doe'
        callback null, user.id
      (id, callback) -> User.find id, callback
      (user, callback) ->
        expect(user).to.have.keys 'id', 'name'
        expect(user.name).to.have.keys 'first', 'last'
        expect(user.name.first).to.eql 'John'
        expect(user.name.last).to.eql 'Doe'
        callback null
    ], done

  it 'constraint', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: { type: String, required: true }
      middle: String
      last: { type: String, required: true }

    async.waterfall [
      (callback) -> User.create { name: first: 'John', middle: 'F.', last: 'Doe' }, callback
      (user, callback) -> User.find user.id, callback
      (user, callback) ->
        expect(user).to.have.keys 'id', 'name'
        expect(user.name).to.have.keys 'first', 'middle', 'last'
        expect(user.name.first).to.eql 'John'
        expect(user.name.middle).to.eql 'F.'
        expect(user.name.last).to.eql 'Doe'
        callback null
      # missing non-required field
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) -> User.find user.id, callback
      (user, callback) ->
        expect(user).to.have.keys 'id', 'name'
        expect(user.name).to.have.keys 'first', 'middle', 'last'
        expect(user.name.first).to.eql 'John'
        expect(user.name.middle).to.null
        expect(user.name.last).to.eql 'Doe'
        callback null
      # missing required field
      (callback) -> User.create { name: first: 'John', middle: 'F.' }, (error, user) ->
        expect(error).to.exist
        expect(error).to.have.property 'message', "'name.last' is required"
        callback null
    ], done

  it 'query', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    async.waterfall [
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) -> User.create { name: first: 'Bill', last: 'Smith' }, callback
      (user, callback) -> User.create { name: first: 'Daniel', last: 'Smith' }, callback
      (user, callback) -> User.where { 'name.last': 'Smith' }, callback
      (users, callback) ->
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
        callback null
    ], done

  it 'update', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    async.waterfall [
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) ->
        User.find(user.id).update name: first: 'Bill', (error, count) ->
          return callback error if error
          expect(count).to.equal 1
          callback null, user.id
      (id, callback) -> User.find id, callback
      (user, callback) ->
        expect(user).to.have.keys 'id', 'name'
        expect(user.name).to.have.keys 'first', 'last'
        expect(user.name.first).to.eql 'Bill'
        expect(user.name.last).to.eql 'Doe'
        callback null
    ], done

  it 'constraint on update', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: { type: String, required: true }
      middle: String
      last: { type: String, required: true }

    async.waterfall [
      (callback) -> User.create { name: first: 'John', middle: 'F.', last: 'Doe' }, callback
      (user, callback) ->
        User.find(user.id).update name: last: null, (error) ->
          expect(error).to.exist
          expect(error).to.have.property 'message', "'name.last' is required"
          callback null
    ], done

  it 'keys on empty', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String
    User.column 'age', Number

    async.waterfall [
      (callback) -> User.create name: { first: 'John', last: 'Doe' }, age: 20, callback
      (user, callback) ->
        expect(user).to.have.keys 'id', 'name', 'age'
        callback null
      (callback) -> User.create age: 20, callback
      (user, callback) ->
        expect(user).to.have.keys 'id', 'name', 'age'
        expect(user.name).to.null
        callback null
    ], done

  it 'replace object', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    async.waterfall [
      (callback) -> User.create name: { first: 'John', last: 'Doe' }, callback
      (user, callback) ->
        user.name = first: 'Bill'
        expect(user.name.first).to.equal 'Bill'
        user.save callback
      (user, callback) -> User.find user.id, callback
      (user, callback) ->
        expect(user).to.have.keys 'id', 'name'
        expect(user.name).to.have.keys 'first', 'last'
        expect(user.name.first).to.eql 'Bill'
        expect(user.name.last).to.be.null
        callback null
    ], done

  it 'get & set', (done) ->
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

    done null

  it 'select sub', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    async.waterfall [
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) -> User.select 'name.first', callback
      (users, callback) ->
        expect(users).to.have.length 1
        expect(users[0]).to.have.keys 'id', 'name'
        expect(users[0].name).to.have.keys 'first'
        expect(users[0].name.first).to.eql 'John'
        callback null
    ], done

  it 'select super', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    async.waterfall [
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) -> User.select 'name', callback
      (users, callback) ->
        expect(users).to.have.length 1
        expect(users[0]).to.have.keys 'id', 'name'
        expect(users[0].name).to.have.keys 'first', 'last'
        expect(users[0].name.first).to.eql 'John'
        expect(users[0].name.last).to.eql 'Doe'
        callback null
    ], done

  it 'update super null', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    async.waterfall [
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) ->
        User.find(user.id).update name: null, (error, count) ->
          return callback error if error
          expect(count).to.equal 1
          callback null, user.id
      (id, callback) -> User.find id, callback
      (user, callback) ->
        expect(user).to.have.keys 'id', 'name'
        expect(user.name).to.be.null
        callback null
    ], done

  it 'lean option', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    async.waterfall [
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) -> User.select('name').lean().exec callback
      (users, callback) ->
        expect(users).to.have.length 1
        expect(users[0]).to.have.keys 'id', 'name'
        expect(users[0].name).to.have.keys 'first', 'last'
        expect(users[0].name.first).to.eql 'John'
        expect(users[0].name.last).to.eql 'Doe'
        callback null
    ], done

  it 'select for null fields', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    async.waterfall [
      (callback) -> User.create {}, (error, user) ->
        callback error
      # select sub
      (callback) -> User.select 'name.first', (error, users) ->
        return callback error if error
        expect(users).to.have.length 1
        expect(users[0]).to.have.keys 'id', 'name'
        expect(users[0].name).to.eql first: null
        callback null
      # select super
      (callback) -> User.select 'name', (error, users) ->
        return callback error if error
        expect(users).to.have.length 1
        expect(users[0]).to.have.keys 'id', 'name'
        expect(users[0].name).to.be.null
        callback null
      # select sub with lean
      (callback) -> User.select('name.first').lean().exec (error, users) ->
        return callback error if error
        expect(users).to.have.length 1
        expect(users[0]).to.have.keys 'id', 'name'
        expect(users[0].name).to.eql first: null
        callback null
      # select super with lean
      (callback) -> User.select('name').lean().exec (error, users) ->
        return callback error if error
        expect(users).to.have.length 1
        expect(users[0]).to.have.keys 'id', 'name'
        expect(users[0].name).to.be.null
        callback null
    ], done
