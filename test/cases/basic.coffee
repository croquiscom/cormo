_getInvalidID = (id) ->
  if typeof id is 'number'
    # MySQL
    return -1
  else if typeof id is 'string'
    # MongoDB
    return id.replace /./, '9'
  else
    throw new Error 'no support'

module.exports = (models) ->
  it 'create one', (done) ->
    user = new models.User()
    user.name = 'John Doe'
    user.age = 27
    user.should.have.property 'name', 'John Doe'
    user.should.have.property 'age', 27
    done null

  it 'initialize in constructor', (done) ->
    user = new models.User name: 'John Doe', age: 27
    user.should.have.property 'name', 'John Doe'
    user.should.have.property 'age', 27
    done null

  it 'build method', (done) ->
    user = models.User.build name: 'John Doe', age: 27
    user.should.have.property 'name', 'John Doe'
    user.should.have.property 'age', 27
    done null

  it 'add a new record to the database', (done) ->
    user = new models.User name: 'John Doe', age: 27
    user.save (error) ->
      return done error if error
      user.should.have.keys 'id', 'name', 'age'
      done null

  it 'create method', (done) ->
    models.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      user.should.be.an.instanceOf models.User
      user.should.have.keys 'id', 'name', 'age'
      should.exist user.id
      done null

  it 'find a record', (done) ->
    models.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      models.User.find user.id, (error, record) ->
        return done error if error
        should.exist record
        record.should.be.an.instanceOf models.User
        record.should.have.property 'id', user.id
        record.should.have.property 'name', user.name
        record.should.have.property 'age', user.age
        done null

  it 'find non-existing record', (done) ->
    models.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      id = _getInvalidID user.id
      models.User.find id, (error) ->
        should.exist error
        error.should.be.an.instanceOf Error
        error.message.should.equal 'not found'
        done null

  it 'find undefined', (done) ->
    models.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      models.User.find undefined, (error) ->
        should.exist error
        error.should.be.an.instanceOf Error
        error.message.should.equal 'not found'
        done null

  it 'update a record', (done) ->
    models.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      user.name = 'Bill Smith'
      models.User.find user.id, (error, record) ->
        # not yet saved, you will get previous values
        return done error if error
        should.exist record
        record.should.have.property 'id', user.id
        record.should.have.property 'name', 'John Doe'
        record.should.have.property 'age', 27
        user.save (error) ->
          return done error if error
          models.User.find user.id, (error, record) ->
            return done error if error
            should.exist record
            record.should.have.property 'id', user.id
            record.should.have.property 'name', 'Bill Smith'
            record.should.have.property 'age', 27
            done null

  it 'destroy a record', (done) ->
    models.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      models.User.find user.id, (error, record) ->
        return done error if error
        should.exist record
        record.should.have.property 'id', user.id
        record.should.have.property 'name', 'John Doe'
        record.should.have.property 'age', 27
        user.destroy (error) ->
          return done error if error
          models.User.find user.id, (error, record) ->
            should.exist error
            error.should.be.an.instanceOf Error
            error.message.should.equal 'not found'
            done null

  it 'destroy a new record', (done) ->
    user = models.User.build name: 'John Doe', age: 27
    user.destroy (error) ->
      return done error if error
      done null

  it 'try to create with extra data', (done) ->
    user = new models.User { id: 1, name: 'John Doe', age: 27, extra: 'extra' }
    user.should.not.have.property 'id'
    user.should.not.have.property 'extra'
    user.id = 1
    user.should.not.have.property 'id' # id is read only
    user.extra = 'extra'
    user.should.have.property 'extra', 'extra'
    user.save (error, record) ->
      return done error if error
      user.should.be.equal record
      user.should.have.property 'extra', 'extra'
      models.User.find user.id, (error, record) ->
        return done error if error
        record.should.have.property 'id', user.id
        record.should.have.property 'name', user.name
        record.should.have.property 'age', user.age
        record.should.not.have.property 'extra'
        done null

  it 'delete some fields', (done) ->
    models.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      user.name = null
      user.age = null
      user.save (error, record) ->
        return done error if error
        user.should.be.equal record
        models.User.find user.id, (error, record) ->
          return done error if error
          record.should.not.have.property 'name'
          record.should.not.have.property 'age'
          done null

  it 'find records', (done) ->
    async.parallel [
      (callback) -> models.User.create { name: 'John Doe', age: 27 }, callback
      (callback) -> models.User.create { name: 'Bill Smith', age: 45 }, callback
      (callback) -> models.User.create { name: 'Alice Jackson', age: 27 }, callback
    ], (error, users) ->
      return done error if error
      users.sort (a, b) -> if a.id < b.id then -1 else 1
      async.waterfall [
        (callback) -> models.User.find [users[0].id, users[1].id], callback
        (records, callback) ->
          records.sort (a, b) -> if a.id < b.id then -1 else 1
          records[0].should.be.an.instanceOf models.User
          records[1].should.be.an.instanceOf models.User
          records[0].should.eql users[0]
          records[1].should.eql users[1]
          callback null
      ], (error) ->
        return done error if error
        done null

  it 'find records with non-existing id', (done) ->
    async.parallel [
      (callback) -> models.User.create { name: 'John Doe', age: 27 }, callback
      (callback) -> models.User.create { name: 'Bill Smith', age: 45 }, callback
      (callback) -> models.User.create { name: 'Alice Jackson', age: 27 }, callback
    ], (error, users) ->
      return done error if error
      users.sort (a, b) -> if a.id < b.id then -1 else 1
      models.User.find [users[2].id, users[1].id, _getInvalidID(users[0].id)], (error, records) ->
        should.exist error
        error.should.be.an.instanceOf Error
        error.message.should.equal 'not found'
        done null

  it 'find records duplicate', (done) ->
    async.parallel [
      (callback) -> models.User.create { name: 'John Doe', age: 27 }, callback
      (callback) -> models.User.create { name: 'Bill Smith', age: 45 }, callback
      (callback) -> models.User.create { name: 'Alice Jackson', age: 27 }, callback
    ], (error, users) ->
      return done error if error
      users.sort (a, b) -> if a.id < b.id then -1 else 1
      async.waterfall [
        (callback) -> models.User.find [users[2].id, users[0].id, users[0].id, users[0].id, users[2].id], callback
        (records, callback) ->
          records.sort (a, b) -> if a.id < b.id then -1 else 1
          records[0].should.be.an.instanceOf models.User
          records[1].should.be.an.instanceOf models.User
          records[0].should.eql users[0]
          records[1].should.eql users[2]
          callback null
      ], (error) ->
        return done error if error
        done null

  it 'find while preserving order', (done) ->
    async.parallel [
      (callback) -> models.User.create { name: 'John Doe', age: 27 }, callback
      (callback) -> models.User.create { name: 'Bill Smith', age: 45 }, callback
      (callback) -> models.User.create { name: 'Alice Jackson', age: 27 }, callback
    ], (error, users) ->
      return done error if error
      async.waterfall [
        (callback) -> models.User.findPreserve [users[2].id, users[0].id, users[0].id, users[0].id, users[2].id], callback
        (records, callback) ->
          records.should.have.length 5
          records[0].should.eql users[2]
          records[1].should.eql users[0]
          records[2].should.eql users[0]
          records[3].should.eql users[0]
          records[4].should.eql users[2]
          callback null
      ], (error) ->
        return done error if error
        done null

  it 'createBulk', (done) ->
    data = [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
      { name: 'Alice Jackson', age: 27 }
    ]
    models.User.createBulk data, (error, users) ->
      return done error if error
      should.exist users
      users.should.be.an.instanceOf Array
      users.should.have.length 3
      async.forEach users, (user, callback) ->
        user.should.be.an.instanceOf models.User
        user.should.have.keys 'id', 'name', 'age'
        should.exist user.id
        models.User.find user.id, (error, record) ->
          return callback error if error
          user.should.eql record
          callback error
      , done

  it 'dirty', (done) ->
    return done null if not models.User.dirty_tracking
    models.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error

      user.isDirty().should.be.equal false
      user.getChanged().should.be.eql []
      should.not.exist user.getPrevious('name')

      user.name = 'Bill Smith'
      user.isDirty().should.be.equal true
      user.getChanged().should.be.eql ['name']
      user.getPrevious('name').should.be.equal 'John Doe'

      user.name = 'Alice Jackson'
      user.isDirty().should.be.equal true
      user.getChanged().should.be.eql ['name']
      user.getPrevious('name').should.be.equal 'John Doe'

      user.age = 10
      user.isDirty().should.be.equal true
      user.getChanged().sort().should.be.eql ['age','name']
      user.getPrevious('name').should.be.equal 'John Doe'
      user.getPrevious('age').should.be.equal 27

      user.reset()
      user.name.should.be.equal 'John Doe'
      user.age.should.be.equal 27
      user.isDirty().should.be.equal false
      user.getChanged().should.be.eql []
      should.not.exist user.getPrevious('name')

      done null

  it 'dirty after save', (done) ->
    return done null if not models.User.dirty_tracking
    models.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      user.name = 'Bill Smith'
      user.isDirty().should.be.equal true
      user.getChanged().should.be.eql ['name']
      user.save (error) ->
        return done error if error
        user.isDirty().should.be.equal false
        user.getChanged().should.be.eql []
        done null

  it 'get & set', (done) ->
    user = new models.User name: 'John Doe', age: 27
    user.get('name').should.be.equal 'John Doe'
    user.get('age').should.be.equal 27
    user.set 'name', 'Bill Smith'
    user.get('name').should.be.equal 'Bill Smith'
    done null
