should = require 'should'
async = require 'async'

_createUsers = (User, data, callback) ->
  if typeof data is 'function'
    callback = data
    data = [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
      { name: 'Alice Jackson', age: 27 }
      { name: 'Gina Baker', age: 32 }
    ]
  async.map data, (item, callback) ->
      User.create item, callback
    , callback

module.exports = (models) ->
  it 'simple where', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where { age: 27 }, (error, users) ->
        return done error if error
        users.should.have.length 2
        if users[0].name is 'John Doe'
          users[0].should.have.property 'name', 'John Doe'
          users[0].should.have.property 'age', 27
          users[1].should.have.property 'name', 'Alice Jackson'
          users[1].should.have.property 'age', 27
        else
          users[0].should.have.property 'name', 'Alice Jackson'
          users[0].should.have.property 'age', 27
          users[1].should.have.property 'name', 'John Doe'
          users[1].should.have.property 'age', 27
        done null

  it 'where chain', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where(age: 27).where(name: 'Alice Jackson').exec (error, users) ->
        return done error if error
        users.should.have.length 1
        users[0].should.have.property 'name', 'Alice Jackson'
        users[0].should.have.property 'age', 27
        done null
