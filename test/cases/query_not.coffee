_compareUser = (user, expected) ->
  if expected.age?
    user.should.have.keys 'id', 'name', 'age'
    user.age.should.equal expected.age
  else
    user.should.have.keys 'id', 'name'
  user.name.should.equal expected.name

_createUsers = (User, data, callback) ->
  if typeof data is 'function'
    callback = data
    data = [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
      { name: 'Alice Jackson', age: 27 }
      { name: 'Gina Baker' }
      { name: 'Daniel Smith', age: 8 }
    ]
  data.sort -> 0.5 - Math.random() # random sort
  User.createBulk data, callback

module.exports = (models) ->
  it 'simple not', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where age: $not: 27, (error, users) ->
        return done error if error
        users.should.have.length 3
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Daniel Smith', age: 8
        _compareUser users[2], name: 'Gina Baker'
        done null

  it 'where not chain', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where(age: $not: 27).where(name: $not: 'Daniel Smith').exec (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Gina Baker'
        done null

  it 'not for id', (done) ->
    _createUsers models.User, (error, users) ->
      target = users[0]
      return done error if error
      models.User.where { id: $not: target.id }, (error, users) ->
        return done error if error
        users.should.have.length 4
        done null

  it 'not for comparison', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where age: $gt: 30, (error, users) ->
        return done error if error
        users.should.have.length 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        # '> 30' != 'not < 30' because of null value
        models.User.where age: $not: $lt: 30, (error, users) ->
          return done error if error
          users.should.have.length 2
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          _compareUser users[0], name: 'Bill Smith', age: 45
          _compareUser users[1], name: 'Gina Baker'
          done null

  it 'not contains', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where name: $not: $contains: 'smi', (error, users) ->
        return done error if error
        users.should.have.length 3
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'Gina Baker'
        _compareUser users[2], name: 'John Doe', age: 27
        done null

  it 'not $in', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where age: $not: $in: [ 27, 45, 57 ], (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Daniel Smith', age: 8
        _compareUser users[1], name: 'Gina Baker'
        done null

  it 'not $in for id', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      users.sort (a, b) -> if a.name < b.name then -1 else 1
      models.User.where id: $not: $in: [ users[2].id, users[0].id ], (error, users) ->
        return done error if error
        users.should.have.length 3
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Gina Baker'
        _compareUser users[2], name: 'John Doe', age: 27
        done null

  it 'not for implicit $in', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where age: $not: [ 27, 45, 57 ], (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Daniel Smith', age: 8
        _compareUser users[1], name: 'Gina Baker'
        done null
