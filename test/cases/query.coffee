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
  it 'simple where', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: 27, (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'John Doe', age: 27
        done null

  it 'where chain', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where(age: 27).where(name: 'Alice Jackson').exec (error, users) ->
        return done error if error
        users.should.have.length 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        done null

  it 'id', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      target = users[0]
      return done error if error
      _g.connection.User.where { id: target.id }, (error, users) ->
        return done error if error
        users.should.have.length 1
        _compareUser users[0], target
        done null

  it 'implicit and', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: 27, name: 'Alice Jackson', (error, users) ->
        return done error if error
        users.should.have.length 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        done null

  it '$or', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where $or: [ { age: 32 }, { name: 'John Doe' } ], (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Gina Baker', age: 32
        _compareUser users[1], name: 'John Doe', age: 27
        done null

  it 'comparison', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where [ { age: { $gt: 30 } }, { age: { $lte: 45 } } ], (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Gina Baker', age: 32
        done null

  it 'contains', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where { name: { $contains: 'smi' } }, (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Daniel Smith', age: 8
        done null

  it '$in', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: $in: [ 32, 45, 57 ], (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Gina Baker', age: 32
        done null

  it '$in for id', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      users.sort (a, b) -> if a.name < b.name then -1 else 1
      _g.connection.User.where id: $in: [ users[2].id, users[0].id ], (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'Daniel Smith', age: 8
        done null

  it 'implicit $in', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where age: [ 32, 45, 57 ], (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Bill Smith', age: 45
        _compareUser users[1], name: 'Gina Baker', age: 32
        done null

  it 'count none', (done) ->
    _g.connection.User.count (error, count) ->
      count.should.equal 0
      done null

  it 'count all', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.count (error, count) ->
        count.should.equal 5
        done null

  it 'count condition', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.count age: 27, (error, count) ->
        count.should.equal 2
        done null

  it 'delete all', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.delete (error, count) ->
        count.should.equal 5
        _g.connection.User.where (error, users) ->
          return done error if error
          users.should.have.length 0
          done null

  it 'delete condition', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.delete age: 27, (error, count) ->
        count.should.equal 2
        _g.connection.User.where (error, users) ->
          return done error if error
          users.should.have.length 3
          users.sort (a, b) -> if a.name < b.name then -1 else 1
          _compareUser users[0], name: 'Bill Smith', age: 45
          _compareUser users[1], name: 'Daniel Smith', age: 8
          _compareUser users[2], name: 'Gina Baker', age: 32
          done null

  it 'limit', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.async.series [
        (callback) ->
          _g.connection.User.query().exec (error, users) ->
            return callback error if error
            users.should.have.length 5
            callback null
        (callback) ->
          _g.connection.User.query().limit(3).exec (error, users) ->
            return callback error if error
            users.should.have.length 3
            callback null
        (callback) ->
          _g.connection.User.where(age: { $lt: 40 }).exec (error, users) ->
            return callback error if error
            users.should.have.length 4
            callback null
        (callback) ->
          _g.connection.User.where(age: { $lt: 40 }).limit(1).exec (error, users) ->
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

  it 'one', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.async.series [
        (callback) ->
          _g.connection.User.where(age: { $lt: 40 }).one().exec (error, user) ->
            return callback error if error
            user.should.have.property 'name'
            if user.name is 'Alice Jackson'
              _compareUser user, name: 'Alice Jackson', age: 27
            else if user.name is 'John Doe'
              _compareUser user, name: 'John Doe', age: 27
            else if user.name is 'Gina Baker'
              _compareUser user, name: 'Gina Baker', age: 32
            else
              _compareUser user, name: 'Daniel Smith', age: 8
            callback null
        (callback) ->
          _g.connection.User.where(age: { $lt: 5}).one().exec (error, user) ->
            should.not.exist user
            callback null
      ], (error) ->
        done error

  it 'skip', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.async.series [
        (callback) ->
          _g.connection.User.query().order('age').skip(3).exec (error, users) ->
            return callback error if error
            users.should.have.length 2
            _compareUser users[0], name: 'Gina Baker', age: 32
            _compareUser users[1], name: 'Bill Smith', age: 45
            callback null
        (callback) ->
          _g.connection.User.query().order('age').skip(1).limit(2).exec (error, users) ->
            return callback error if error
            users.should.have.length 2
            users.sort (a, b) -> if a.name < b.name then -1 else 1
            _compareUser users[0], name: 'Alice Jackson', age: 27
            _compareUser users[1], name: 'John Doe', age: 27
            callback null
      ], done

  it 'select', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.async.series [
        (callback) ->
          _g.connection.User.select (error, users) ->
            return callback error if error
            users[0].should.have.keys 'id', 'name', 'age'
            callback null
        (callback) ->
          _g.connection.User.select 'name age address', (error, users) ->
            return callback error if error
            users[0].should.have.keys 'id', 'name', 'age'
            callback null
        (callback) ->
          _g.connection.User.select 'name', (error, users) ->
            return callback error if error
            users[0].should.have.keys 'id', 'name'
            callback null
        (callback) ->
          _g.connection.User.select '', (error, users) ->
            return callback error if error
            users[0].should.have.keys 'id'
            callback null
      ], (error) ->
        done error

  it 'order (string)', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.order 'name', (error, users) ->
        return done error if error
        users.should.have.length 5
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'Bill Smith', age: 45
        _compareUser users[2], name: 'Daniel Smith', age: 8
        _compareUser users[3], name: 'Gina Baker', age: 32
        _compareUser users[4], name: 'John Doe', age: 27
        _g.connection.User.order '-name', (error, users) ->
          return done error if error
          users.should.have.length 5
          _compareUser users[0], name: 'John Doe', age: 27
          _compareUser users[1], name: 'Gina Baker', age: 32
          _compareUser users[2], name: 'Daniel Smith', age: 8
          _compareUser users[3], name: 'Bill Smith', age: 45
          _compareUser users[4], name: 'Alice Jackson', age: 27
          done null

  it 'order (number)', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.order 'age', (error, users) ->
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
        _g.connection.User.order '-age', (error, users) ->
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
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.order 'age name', (error, users) ->
        return done error if error
        users.should.have.length 5
        _compareUser users[0], name: 'Daniel Smith', age: 8
        _compareUser users[1], name: 'Alice Jackson', age: 27
        _compareUser users[2], name: 'John Doe', age: 27
        _compareUser users[3], name: 'Gina Baker', age: 32
        _compareUser users[4], name: 'Bill Smith', age: 45
        _g.connection.User.order 'age -name', (error, users) ->
          return done error if error
          users.should.have.length 5
          _compareUser users[0], name: 'Daniel Smith', age: 8
          _compareUser users[1], name: 'John Doe', age: 27
          _compareUser users[2], name: 'Alice Jackson', age: 27
          _compareUser users[3], name: 'Gina Baker', age: 32
          _compareUser users[4], name: 'Bill Smith', age: 45
          done null

  it 'return_raw_instance for a single record', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      _g.connection.User.find(user.id).return_raw_instance().exec (error, record) ->
        return done error if error
        should.exist record
        record.should.not.be.an.instanceOf _g.connection.User
        record.should.have.property 'id', user.id
        record.should.have.property 'name', user.name
        record.should.have.property 'age', user.age
        done null

  it 'return_raw_instance for multiple records', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where(age: 27).return_raw_instance().exec (error, users) ->
        return done error if error
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        users[0].should.not.be.an.instanceOf _g.connection.User
        _compareUser users[0], name: 'Alice Jackson', age: 27
        users[1].should.not.be.an.instanceOf _g.connection.User
        _compareUser users[1], name: 'John Doe', age: 27
        done null

  it 'return_raw_instance of null value with select', (done) ->
    _g.connection.User.createBulk [ { name: 'Gina Baker' } ], (error, users) ->
      return done error if error
      _g.connection.User.select('name age').return_raw_instance().exec (error, users) ->
        return done error if error
        users.should.have.length 1
        if _g.connection.User.eliminate_null
          users[0].should.have.keys 'id', 'name'
        else
          users[0].should.have.keys 'id', 'name', 'age'
        done null

  it 'return_raw_instance of null value without select', (done) ->
    _g.connection.User.createBulk [ { name: 'Gina Baker' } ], (error, users) ->
      return done error if error
      _g.connection.User.query().return_raw_instance().exec (error, users) ->
        return done error if error
        users.should.have.length 1
        if _g.connection.User.eliminate_null
          users[0].should.have.keys 'id', 'name'
        else
          users[0].should.have.keys 'id', 'name', 'age'
        done null

  it 'cache', (done) ->
    _g.async.waterfall [
      (callback) ->
        _createUsers _g.connection.User, callback
      (users, callback) ->
        _g.connection.User.where(age: 27).cache(key: 'user', ttl: 30, refresh: true).exec callback
      (users, callback) ->
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'John Doe', age: 27
        callback null
      (callback) ->
        # different conditions, will return cached result
        _g.connection.User.where(age: 8).cache(key: 'user', ttl: 30).exec callback
      (users, callback) ->
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'John Doe', age: 27
        callback null
      (callback) ->
        # try ignoring cache
        _g.connection.User.where(age: 8).cache(key: 'user', ttl: 30, refresh: true).exec callback
      (users, callback) ->
        users.should.have.length 1
        _compareUser users[0], name: 'Daniel Smith', age: 8
        callback null
      (callback) ->
        # different conditions, will return cached result
        _g.connection.User.where(age: 32).cache(key: 'user', ttl: 30).exec callback
      (users, callback) ->
        users.should.have.length 1
        _compareUser users[0], name: 'Daniel Smith', age: 8
        callback null
      # try after removing cache
      (callback) ->
        _g.connection.User.removeCache 'user', callback
      (callback) ->
        _g.connection.User.where(age: 32).cache(key: 'user', ttl: 30).exec callback
      (users, callback) ->
        users.should.have.length 1
        _compareUser users[0], name: 'Gina Baker', age: 32
        callback null
    ], done

  it 'comparison on id', (done) ->
    _createUsers _g.connection.User, (error, users) ->
      return done error if error
      _g.connection.User.where id: $lt: users[2].id, (error, records) ->
        return done error if error
        records.should.have.length 2
        _compareUser users[0], records[0]
        _compareUser users[1], records[1]
        _g.connection.User.count id: $lt: users[2].id, (error, count) ->
          return done error if error
          count.should.equal 2
          done null
