module.exports = (models) ->
  it 'define a model, create an instance and fetch it', (done) ->
    User = models.User

    User.column 'name'
      first: String
      last: String

    async.waterfall [
      (callback) -> models.connection.applySchemas callback
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) ->
        user.should.have.keys 'id', 'name'
        user.name.should.have.keys 'first', 'last'
        user.name.first.should.eql 'John'
        user.name.last.should.eql 'Doe'
        callback null, user.id
      (id, callback) -> User.find id, callback
      (user, callback) ->
        user.should.have.keys 'id', 'name'
        user.name.should.have.keys 'first', 'last'
        user.name.first.should.eql 'John'
        user.name.last.should.eql 'Doe'
        callback null
    ], done

  it 'another style to define a model', (done) ->
    User = models.User

    User.column 'name.first', String
    User.column 'name.last', String

    async.waterfall [
      (callback) -> models.connection.applySchemas callback
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) ->
        user.should.have.keys 'id', 'name'
        user.name.should.have.keys 'first', 'last'
        user.name.first.should.eql 'John'
        user.name.last.should.eql 'Doe'
        callback null, user.id
      (id, callback) -> User.find id, callback
      (user, callback) ->
        user.should.have.keys 'id', 'name'
        user.name.should.have.keys 'first', 'last'
        user.name.first.should.eql 'John'
        user.name.last.should.eql 'Doe'
        callback null
    ], done

  it 'constraint', (done) ->
    User = models.User

    User.column 'name'
      first: { type: String, required: true }
      middle: String
      last: { type: String, required: true }

    async.waterfall [
      (callback) -> models.connection.applySchemas callback
      (callback) -> User.create { name: first: 'John', middle: 'F.', last: 'Doe' }, callback
      (user, callback) -> User.find user.id, callback
      (user, callback) ->
        user.should.have.keys 'id', 'name'
        user.name.should.have.keys 'first', 'middle', 'last'
        user.name.first.should.eql 'John'
        user.name.middle.should.eql 'F.'
        user.name.last.should.eql 'Doe'
        callback null
      # missing non-required field
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) -> User.find user.id, callback
      (user, callback) ->
        user.should.have.keys 'id', 'name'
        user.name.should.have.keys 'first', 'last'
        user.name.first.should.eql 'John'
        user.name.last.should.eql 'Doe'
        callback null
      # missing required field
      (callback) -> User.create { name: first: 'John', middle: 'F.' }, (error, user) ->
        error.should.exist
        error.should.have.property 'message', "'name.last' is required"
        callback null
    ], done

  it 'query', (done) ->
    User = models.User

    User.column 'name'
      first: String
      last: String

    async.waterfall [
      (callback) -> models.connection.applySchemas callback
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) -> User.create { name: first: 'Bill', last: 'Smith' }, callback
      (user, callback) -> User.create { name: first: 'Daniel', last: 'Smith' }, callback
      (user, callback) -> User.where { 'name.last': 'Smith' }, callback
      (users, callback) ->
        users.should.have.length 2
        users.sort (a, b) -> if a.name.first < b.name.first then -1 else 1
        users[0].should.have.keys 'id', 'name'
        users[0].name.should.have.keys 'first', 'last'
        users[0].name.first.should.eql 'Bill'
        users[0].name.last.should.eql 'Smith'
        users[1].should.have.keys 'id', 'name'
        users[1].name.should.have.keys 'first', 'last'
        users[1].name.first.should.eql 'Daniel'
        users[1].name.last.should.eql 'Smith'
        callback null
    ], done

  it 'update', (done) ->
    User = models.User

    User.column 'name'
      first: String
      last: String

    async.waterfall [
      (callback) -> models.connection.applySchemas callback
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) ->
        User.find(user.id).update name: first: 'Bill', (error, count) ->
          return callback error if error
          count.should.be.equal 1
          callback null, user.id
      (id, callback) -> User.find id, callback
      (user, callback) ->
        user.should.have.keys 'id', 'name'
        user.name.should.have.keys 'first', 'last'
        user.name.first.should.eql 'Bill'
        user.name.last.should.eql 'Doe'
        callback null
    ], done

  it 'constraint on update', (done) ->
    User = models.User

    User.column 'name'
      first: { type: String, required: true }
      middle: String
      last: { type: String, required: true }

    async.waterfall [
      (callback) -> models.connection.applySchemas callback
      (callback) -> User.create { name: first: 'John', middle: 'F.', last: 'Doe' }, callback
      (user, callback) ->
        User.find(user.id).update name: last: null, (error) ->
          error.should.exist
          error.should.have.property 'message', "'name.last' is required"
          callback null
    ], done
