should = require 'should'
async = require 'async'

_createUsers = (User, data, callback) ->
  if typeof data is 'function'
    callback = data
    data = [
      { name: 'John Doe', age: 27, email: 'john.doe@example.com', facebook_id: '1' }
      { name: 'Bill Smith', age: 45, email: 'bill@foo.org', facebook_id: '2' }
      { name: 'Alice Jackson', age: 27, email: 'ceo@wonderful.com', facebook_id: '3' }
      { name: 'Gina Baker', age: 32, email: 'gina@example.com', facebook_id: '4' }
    ]
  async.map data, (item, callback) ->
      User.create item, callback
    , callback

module.exports = (models) ->
  it 'unique', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.create { name: 'Bill Simpson', age: 38, email: 'bill@foo.org' }, (error, user) ->
        should.exist error
        # 'duplicated email' or 'duplicated'
        error.message.should.match /^duplicated( email)?$/
        should.exist user
        user.should.have.property 'name', 'Bill Simpson'
        user.should.have.property 'age', 38
        user.should.have.property 'email', 'bill@foo.org'
        done null

  it 'check uniqueness on update', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      users[0].email = 'bill@foo.org'
      users[0].save (error) ->
        should.exist error
        # 'duplicated email' or 'duplicated'
        error.message.should.match /^duplicated( email)?$/
        done null

  it 'required', (done) ->
    async.parallel [
      (callback) ->
        models.User.create { age: 10, email: 'test1@example.com' }, (error, user) ->
          should.exist error
          error.message.should.equal "'name' is required"
          callback null
      (callback) ->
        models.User.create { name: 'test', email: 'test2@example.com' }, (error, user) ->
          should.exist error
          error.message.should.equal "'age' is required"
          callback null
      (callback) ->
        models.User.create { name: 'test', age: 10 }, (error, user) ->
          should.exist error
          error.message.should.equal "'email' is required"
          callback null
    ], (error) ->
      done error

  it 'unique but not required', (done) ->
    # There can be two null values
    # ( MongoDB can have an index unique but not sparse )
    models.User.create { name: 'test', age: 10, email: 'test1@example.com' }, (error, user) ->
      return done error if error
      models.User.create { name: 'test', age: 10, email: 'test2@example.com' }, (error, user) ->
        return done error if error
        done null
