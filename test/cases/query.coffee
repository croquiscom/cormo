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
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'John Doe', age: 27
        done null

  it 'where chain', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where(age: 27).where(name: 'Alice Jackson').exec (error, users) ->
        return done error if error
        users.should.have.length 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        done null

  it 'id', (done) ->
    _createUsers models.User, (error, users) ->
      target = users[0]
      return done error if error
      models.User.where { id: target.id }, (error, users) ->
        return done error if error
        users.should.have.length 1
        _compareUser users[0], target
        done null

  it 'implicit and', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where age: 27, name: 'Alice Jackson', (error, users) ->
        return done error if error
        users.should.have.length 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        done null

  it '$or', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where $or: [ { age: 32 }, { name: 'John Doe' } ], (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Gina Baker', age: 32
        _compareUser users[1], name: 'John Doe', age: 27
        done null

  it 'comparison', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where [ { age: { $gt: 30 } }, { age: { $lte: 45 } } ], (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Gina Baker', age: 32
        done null

  it 'contains', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where { name: { $contains: 'smi' } }, (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Daniel Smith', age: 8
        done null

  it '$in', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where age: $in: [ 32, 45, 57 ], (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Gina Baker', age: 32
        done null

  it '$in for id', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      users.sort (a, b) -> if a.name < b.name then -1 else 1
      models.User.where id: $in: [ users[2].id, users[0].id ], (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'Daniel Smith', age: 8
        done null

  it 'implicit $in', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.where age: [ 32, 45, 57 ], (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Gina Baker', age: 32
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
          _compareUser users[0], name: 'Bill Smith', age: 45
          _compareUser users[1], name: 'Daniel Smith', age: 8
          _compareUser users[2], name: 'Gina Baker', age: 32
          done null

  it 'limit', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      async.series [
        (callback) ->
          models.User.where().exec (error, users) ->
            return callback error if error
            users.should.have.length 5
            callback null
        (callback) ->
          models.User.where().limit(3).exec (error, users) ->
            return callback error if error
            users.should.have.length 3
            callback null
        (callback) ->
          models.User.where(age: { $lt: 40 }).exec (error, users) ->
            return callback error if error
            users.should.have.length 4
            callback null
        (callback) ->
          models.User.where(age: { $lt: 40 }).limit(1).exec (error, users) ->
            return callback error if error
            users.should.have.length 1
            users[0].should.have.property 'name'
            if users[0].name is 'Alice Jackson'
              _compareUser users[0], name: 'Alice Jackson', age: 27
            else if users[0].name is 'John Doe'
              _compareUser users[0], name: 'John Doe', age: 27
            else if users[0].name is 'Gina Baker'
              _compareUser users[0], name: 'Gina Baker', age: 32
            else
              _compareUser users[0], name: 'Daniel Smith', age: 8
            callback null
      ], (error) ->
        done error

  it 'select', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      async.series [
        (callback) ->
          models.User.select (error, users) ->
            return callback error if error
            users[0].should.have.keys [ 'id', 'name', 'age' ]
            callback null
        (callback) ->
          models.User.select 'name age address', (error, users) ->
            return callback error if error
            users[0].should.have.keys [ 'id', 'name', 'age' ]
            callback null
        (callback) ->
          models.User.select 'name', (error, users) ->
            return callback error if error
            users[0].should.have.keys [ 'id', 'name' ]
            callback null
      ], (error) ->
        done error

  it 'order (string)', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.order 'name', (error, users) ->
        return done error if error
        users.should.have.length 5
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'Bill Smith', age: 45
        _compareUser users[2], name: 'Daniel Smith', age: 8
        _compareUser users[3], name: 'Gina Baker', age: 32
        _compareUser users[4], name: 'John Doe', age: 27
        models.User.order '-name', (error, users) ->
          return done error if error
          users.should.have.length 5
          _compareUser users[0], name: 'John Doe', age: 27
          _compareUser users[1], name: 'Gina Baker', age: 32
          _compareUser users[2], name: 'Daniel Smith', age: 8
          _compareUser users[3], name: 'Bill Smith', age: 45
          _compareUser users[4], name: 'Alice Jackson', age: 27
          done null

  it 'order (number)', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.order 'age', (error, users) ->
        return done error if error
        users.should.have.length 5
        _compareUser users[0], name: 'Daniel Smith', age: 8
        if users[1].name is 'Alice Jackson'
          _compareUser users[1], name: 'Alice Jackson', age: 27
          _compareUser users[2], name: 'John Doe', age: 27
        else
          _compareUser users[1], name: 'John Doe', age: 27
          _compareUser users[2], name: 'Alice Jackson', age: 27
        _compareUser users[3], name: 'Gina Baker', age: 32
        _compareUser users[4], name: 'Bill Smith', age: 45
        models.User.order '-age', (error, users) ->
          return done error if error
          users.should.have.length 5
          _compareUser users[0], name: 'Bill Smith', age: 45
          _compareUser users[1], name: 'Gina Baker', age: 32
          if users[2].name is 'Alice Jackson'
            _compareUser users[2], name: 'Alice Jackson', age: 27
            _compareUser users[3], name: 'John Doe', age: 27
          else
            _compareUser users[2], name: 'John Doe', age: 27
            _compareUser users[3], name: 'Alice Jackson', age: 27
          _compareUser users[4], name: 'Daniel Smith', age: 8
          done null

  it 'order (complex)', (done) ->
    _createUsers models.User, (error, users) ->
      return done error if error
      models.User.order 'age name', (error, users) ->
        return done error if error
        users.should.have.length 5
        _compareUser users[0], name: 'Daniel Smith', age: 8
        _compareUser users[1], name: 'Alice Jackson', age: 27
        _compareUser users[2], name: 'John Doe', age: 27
        _compareUser users[3], name: 'Gina Baker', age: 32
        _compareUser users[4], name: 'Bill Smith', age: 45
        models.User.order 'age -name', (error, users) ->
          return done error if error
          users.should.have.length 5
          _compareUser users[0], name: 'Daniel Smith', age: 8
          _compareUser users[1], name: 'John Doe', age: 27
          _compareUser users[2], name: 'Alice Jackson', age: 27
          _compareUser users[3], name: 'Gina Baker', age: 32
          _compareUser users[4], name: 'Bill Smith', age: 45
          done null
