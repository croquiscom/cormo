_compareUser = (user, expected) ->
  user.should.have.keys 'id', 'name', 'age'
  user.name.should.equal expected.name
  user.age.should.equal expected.age

_createUsers = (User, data, callback) ->
  if typeof data is 'function'
    callback = data
    data = [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
      { name: 'Alice Jackson', age: 27 }
      { name: 'Gina Baker', age: 32 }
      { name: 'Daniel Smith', age: 8 }
    ]
  data.sort -> 0.5 - Math.random() # random sort
  User.createBulk data, callback

module.exports = () ->
  it 'update all', (done) ->
    _createUsers connection.User, (error, users) ->
      return done error if error
      connection.User.update age: 10, (error, count) ->
        return done error if error
        count.should.equal 5
        connection.User.where (error, users) ->
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          _compareUser users[0], name: 'Alice Jackson', age: 10
          _compareUser users[1], name: 'Bill Smith', age: 10
          _compareUser users[2], name: 'Daniel Smith', age: 10
          _compareUser users[3], name: 'Gina Baker', age: 10
          _compareUser users[4], name: 'John Doe', age: 10
          done null

  it 'update condition', (done) ->
    _createUsers connection.User, (error, users) ->
      return done error if error
      connection.User.update { age: 10 }, age: 27, (error, count) ->
        return done error if error
        count.should.equal 2
        connection.User.where (error, users) ->
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          _compareUser users[0], name: 'Alice Jackson', age: 10
          _compareUser users[1], name: 'Bill Smith', age: 45
          _compareUser users[2], name: 'Daniel Smith', age: 8
          _compareUser users[3], name: 'Gina Baker', age: 32
          _compareUser users[4], name: 'John Doe', age: 10
          done null

  it 'find & update', (done) ->
    _createUsers connection.User, (error, users) ->
      users.sort (a, b) -> if a.name < b.name then -1 else 1
      return done error if error
      connection.User.find(users[2].id).update age: 10, (error, count) ->
        return done error if error
        count.should.equal 1
        connection.User.where (error, users) ->
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          _compareUser users[0], name: 'Alice Jackson', age: 27
          _compareUser users[1], name: 'Bill Smith', age: 45
          _compareUser users[2], name: 'Daniel Smith', age: 10
          _compareUser users[3], name: 'Gina Baker', age: 32
          _compareUser users[4], name: 'John Doe', age: 27
          done null

  it 'update to remove a field (set null)', (done) ->
    _createUsers connection.User, (error, users) ->
      return done error if error
      connection.User.find(users[2].id).update age: null, (error, count) ->
        return done error if error
        count.should.equal 1
        connection.User.find users[2].id, (error, user) ->
          if connection.User.eliminate_null
            user.should.have.keys 'id', 'name'
          else
            user.should.have.keys 'id', 'name', 'age'
          done null
