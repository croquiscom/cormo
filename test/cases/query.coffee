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
      { name: 'Daniel Smith', age: 53 }
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

  it '$or', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where $or: [ { age: 32 }, { name: 'John Doe' } ], (error, users) ->
        return done error if error
        users.should.have.length 2
        if users[0].name is 'John Doe'
          users[0].should.have.property 'name', 'John Doe'
          users[0].should.have.property 'age', 27
          users[1].should.have.property 'name', 'Gina Baker'
          users[1].should.have.property 'age', 32
        else
          users[0].should.have.property 'name', 'Gina Baker'
          users[0].should.have.property 'age', 32
          users[1].should.have.property 'name', 'John Doe'
          users[1].should.have.property 'age', 27
        done null

  it 'comparison', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where [ { age: { $gt: 30 } }, { age: { $lte: 45 } } ], (error, users) ->
        return done error if error
        users.should.have.length 2
        if users[0].name is 'Bill Smith'
          users[0].should.have.property 'name', 'Bill Smith'
          users[0].should.have.property 'age', 45
          users[1].should.have.property 'name', 'Gina Baker'
          users[1].should.have.property 'age', 32
        else
          users[0].should.have.property 'name', 'Gina Baker'
          users[0].should.have.property 'age', 32
          users[1].should.have.property 'name', 'Bill Smith'
          users[1].should.have.property 'age', 45
        done null

  it 'include', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where { name: { $include: 'smi' } }, (error, users) ->
        return done error if error
        users.should.have.length 2
        if users[0].name is 'Bill Smith'
          users[0].should.have.property 'name', 'Bill Smith'
          users[0].should.have.property 'age', 45
          users[1].should.have.property 'name', 'Daniel Smith'
          users[1].should.have.property 'age', 53
        else
          users[0].should.have.property 'name', 'Daniel Smith'
          users[0].should.have.property 'age', 53
          users[1].should.have.property 'name', 'Bill Smith'
          users[1].should.have.property 'age', 45
        done null
