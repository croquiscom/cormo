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
  it 'Model.create', (done) ->
    _g.connection.User.create name: 'John Doe', age: 27
    .then (user) ->
      expect(user).to.be.an.instanceof _g.connection.User
      expect(user).to.have.keys 'id', 'name', 'age'
      done null
    .catch (error) ->
      done error
    return

  it 'Model::save (create)', (done) ->
    new _g.connection.User name: 'John Doe', age: 27
    .save()
    .then (user) ->
      expect(user).to.have.keys 'id', 'name', 'age'
      done null
    .catch (error) ->
      done error
    return

  it 'Model.find', (done) ->
    _g.connection.User.create name: 'John Doe', age: 27
    .then (user) ->
      _g.connection.User.find user.id
      .exec()
      .then (record) ->
        expect(record).to.exist
        expect(record).to.be.an.instanceof _g.connection.User
        expect(record).to.have.property 'id', user.id
        expect(record).to.have.property 'name', user.name
        expect(record).to.have.property 'age', user.age
    .then ->
      done null
    .catch (error) ->
      done error
    return

  it 'Model.find error', (done) ->
    _g.connection.User.create name: 'John Doe', age: 27
    .then (user) ->
      id = _getInvalidID user.id
      _g.connection.User.find id
      .exec()
    .then ->
      done 'something wrong'
    .catch (error) ->
      expect(error).to.exist
      expect(error).to.be.an.instanceof Error
      expect(error.message).to.equal 'not found'
      done null
    return

  it 'Model::save (update)', (done) ->
    _g.connection.User.create name: 'John Doe', age: 27
    .then (user) ->
      user.name = 'Bill Smith'
      _g.connection.User.find user.id
      .exec()
      .then (record) ->
        # not yet saved, you will get previous values
        expect(record).to.exist
        expect(record).to.have.property 'id', user.id
        expect(record).to.have.property 'name', 'John Doe'
        expect(record).to.have.property 'age', 27
        user.save()
      .then ->
        _g.connection.User.find user.id
        .exec()
      .then (record) ->
        expect(record).to.exist
        expect(record).to.have.property 'id', user.id
        expect(record).to.have.property 'name', 'Bill Smith'
        expect(record).to.have.property 'age', 27
    .then ->
      done null
    .catch (error) ->
      done error
    return
