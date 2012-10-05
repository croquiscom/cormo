should = require 'should'

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
      user.should.have.property 'id'
      done null

  it 'create method', (done) ->
    models.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      user.should.have.property 'id'
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
      id = user.id
      if typeof id is 'number'
        # MySQL
        id = -1
      else if typeof id is 'string'
        # MongoDB
        id = id.replace /./, '9'
      else
        throw new Error 'no support'
      models.User.find id, (error) ->
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
