should = require 'should'
async = require 'async'

_createUsers = (User, data, callback) ->
  if typeof data is 'function'
    callback = data
    data = [
      { name: 'John Doe', age: 27, email: 'john.doe@example.com' }
      { name: 'Bill Smith', age: 45, email: 'bill@foo.org' }
      { name: 'Alice Jackson', age: 27, email: 'ceo@wonderful.com' }
      { name: 'Gina Baker', age: 32, email: 'gina@example.com' }
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
        error.message.should.equal 'duplicated email'
        should.exist user
        user.should.have.property 'name', 'Bill Simpson'
        user.should.have.property 'age', 38
        user.should.have.property 'email', 'bill@foo.org'
        done null
