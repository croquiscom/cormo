_g = require '../common'
async = require 'async'
{expect} = require 'chai'

_createUsers = (User, data, callback) ->
  if typeof data is 'function'
    callback = data
    data = [
      { name: 'John Doe', age: 27, email: 'john.doe@example.com', facebook_id: '1' }
      { name: 'Bill Smith', age: 45, email: 'bill@foo.org', facebook_id: '2' }
      { name: 'Alice Jackson', age: 27, email: 'ceo@wonderful.com', facebook_id: '3' }
      { name: 'Gina Baker', age: 32, email: 'gina@example.com', facebook_id: '4' }
    ]
  User.createBulk data, callback

module.exports = () ->
  it 'unique', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.create { name: 'Bill Simpson', age: 38, email: 'bill@foo.org' }, (error, user) ->
        expect(error).to.exist
        # 'duplicated email' or 'duplicated'
        expect(error.message).to.match /^duplicated( email)?$/
        expect(user).to.not.exist
        done null

  it 'check uniqueness on update by Model::save', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      users[0].email = 'bill@foo.org'
      users[0].save (error) ->
        expect(error).to.exist
        # 'duplicated email' or 'duplicated'
        expect(error.message).to.match /^duplicated( email)?$/
        done null

  it 'check uniqueness on update by Model.update', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.find(users[0].id).update email: 'bill@foo.org', (error) ->
        expect(error).to.exist
        # 'duplicated email' or 'duplicated'
        expect(error.message).to.match /^duplicated( email)?$/
        done null

  it 'required', (done) ->
    async.parallel [
      (callback) ->
        _g.connection.User.create { age: 10, email: 'test1@example.com' }, (error, user) ->
          expect(error).to.exist
          expect(error.message).to.equal "'name' is required"
          callback null
      (callback) ->
        _g.connection.User.create { name: 'test', email: 'test2@example.com' }, (error, user) ->
          expect(error).to.exist
          expect(error.message).to.equal "'age' is required"
          callback null
      (callback) ->
        _g.connection.User.create { name: 'test', age: 10 }, (error, user) ->
          expect(error).to.exist
          expect(error.message).to.equal "'email' is required"
          callback null
    ], (error) ->
      done error

  it 'unique but not required', (done) ->
    # There can be two null values
    # ( MongoDB can have an index unique but not sparse )
    _g.connection.User.create { name: 'test', age: 10, email: 'test1@example.com' }, (error, user) ->
      return done error if error
      _g.connection.User.create { name: 'test', age: 10, email: 'test2@example.com' }, (error, user) ->
        return done error if error
        done null

  it 'required on update by Model::save', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      users[0].name = null
      users[0].save (error) ->
        expect(error).to.exist
        expect(error.message).to.equal "'name' is required"
        done null

  it 'required on update by Model.update', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.find(users[0].id).update name: null, (error) ->
        expect(error).to.exist
        expect(error.message).to.equal "'name' is required"
        done null

  it 'required of belongsTo', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.User.create { name: 'Bill Simpson', age: 38, email: 'bill@foo.org' }, callback
      (user, callback) ->
        _g.connection.Post.create { title: 'first post', body: 'This is the 1st post.' }, (error, post) ->
          expect(error).to.exist
          expect(error.message).to.equal "'user_id' is required"
          callback null, user
      (user, callback) ->
        _g.connection.Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }, callback
    ], (error) ->
      done error
