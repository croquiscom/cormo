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
      models.User.where age: 27, (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
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

  it 'id', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where { id: users[2].id }, (error, users) ->
        return done error if error
        users.should.have.length 1
        users[0].should.have.property 'name', 'Alice Jackson'
        users[0].should.have.property 'age', 27
        done null

  it 'implicit and', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where age: 27, name: 'Alice Jackson', (error, users) ->
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
        users.sort (a, b) -> if a.name < b.name then -1 else 1
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
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        users[0].should.have.property 'name', 'Bill Smith'
        users[0].should.have.property 'age', 45
        users[1].should.have.property 'name', 'Gina Baker'
        users[1].should.have.property 'age', 32
        done null

  it 'include', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where { name: { $include: 'smi' } }, (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        users[0].should.have.property 'name', 'Bill Smith'
        users[0].should.have.property 'age', 45
        users[1].should.have.property 'name', 'Daniel Smith'
        users[1].should.have.property 'age', 53
        done null

  it 'count none', (done) ->
    models.User.count (error, count) ->
      count.should.equal 0
      done null

  it 'count all', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.count (error, count) ->
        count.should.equal 5
        done null

  it 'count condition', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.count age: 27, (error, count) ->
        count.should.equal 2
        done null

  it 'delete all', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.delete (error, count) ->
        count.should.equal 5
        models.User.where (error, users) ->
          return done error if error
          users.should.have.length 0
          done null

  it 'delete condition', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.delete age: 27, (error, count) ->
        count.should.equal 2
        models.User.where (error, users) ->
          return done error if error
          users.should.have.length 3
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          users[0].should.have.property 'name', 'Bill Smith'
          users[0].should.have.property 'age', 45
          users[1].should.have.property 'name', 'Daniel Smith'
          users[1].should.have.property 'age', 53
          users[2].should.have.property 'name', 'Gina Baker'
          users[2].should.have.property 'age', 32
          done null
