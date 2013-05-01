module.exports = () ->
  it 'define a model, create an instance and fetch it', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    _g.async.waterfall [
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

  it 'get a record whose super column is null', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    _g.async.waterfall [
      (callback) -> User.create {}, callback
      (user, callback) -> User.find user.id, callback
      (user, callback) ->
        if _g.connection.User.eliminate_null
          user.should.have.keys 'id'
        else
          user.should.have.keys 'id', 'name'
        #TODO should.not.exist user.name
        callback null
    ], done

  it 'another style to define a model', (done) ->
    User = _g.connection.User

    User.column 'name.first', String
    User.column 'name.last', String

    _g.async.waterfall [
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
    User = _g.connection.User

    User.column 'name',
      first: { type: String, required: true }
      middle: String
      last: { type: String, required: true }

    _g.async.waterfall [
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
        if User.eliminate_null
          user.name.should.have.keys 'first', 'last'
        else
          user.name.should.have.keys 'first', 'middle', 'last'
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
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    _g.async.waterfall [
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
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    _g.async.waterfall [
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
    User = _g.connection.User

    User.column 'name',
      first: { type: String, required: true }
      middle: String
      last: { type: String, required: true }

    _g.async.waterfall [
      (callback) -> User.create { name: first: 'John', middle: 'F.', last: 'Doe' }, callback
      (user, callback) ->
        User.find(user.id).update name: last: null, (error) ->
          error.should.exist
          error.should.have.property 'message', "'name.last' is required"
          callback null
    ], done

  it 'keys on empty', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String
    User.column 'age', Number

    _g.async.waterfall [
      (callback) -> User.create name: { first: 'John', last: 'Doe' }, age: 20, callback
      (user, callback) ->
        user.should.have.keys 'id', 'name', 'age'
        callback null
      (callback) -> User.create age: 20, callback
      (user, callback) ->
        if User.eliminate_null
          user.should.have.keys 'id', 'age'
        else
          user.should.have.keys 'id', 'name', 'age'
          user.should.have.property 'name', null
        callback null
    ], done

  it 'replace object', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    _g.async.waterfall [
      (callback) -> User.create name: { first: 'John', last: 'Doe' }, callback
      (user, callback) ->
        user.name = first: 'Bill'
        user.name.first.should.be.equal 'Bill'
        user.save callback
      (user, callback) -> User.find user.id, callback
      (user, callback) ->
        user.should.have.keys 'id', 'name'
        if User.eliminate_null
          user.name.should.have.keys 'first'
        else
          user.name.should.have.keys 'first', 'last'
        user.name.first.should.eql 'Bill'
        callback null
    ], done

  it 'get & set', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    user = new User name: first: 'John', last: 'Doe'
    user.get('name.first').should.be.equal 'John'
    user.get('name.last').should.be.equal 'Doe'
    user.set 'name.first', 'Bill'
    user.get('name.first').should.be.equal 'Bill'
    user.get('name.last').should.be.equal 'Doe'
    user.set 'name', first: 'John'
    user.get('name.first').should.be.equal 'John'
    should.not.exist user.get('name.last')

    done null

  it 'select sub', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    _g.async.waterfall [
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) -> User.select 'name.first', callback
      (users, callback) ->
        users.should.have.length 1
        users[0].should.have.keys 'id', 'name'
        users[0].name.should.have.keys 'first'
        users[0].name.first.should.eql 'John'
        callback null
    ], done

  it 'select super', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    _g.async.waterfall [
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) -> User.select 'name', callback
      (users, callback) ->
        users.should.have.length 1
        users[0].should.have.keys 'id', 'name'
        users[0].name.should.have.keys 'first', 'last'
        users[0].name.first.should.eql 'John'
        users[0].name.last.should.eql 'Doe'
        callback null
    ], done

  it 'update super null', (done) ->
    User = _g.connection.User

    User.column 'name',
      first: String
      last: String

    _g.async.waterfall [
      (callback) -> User.create { name: first: 'John', last: 'Doe' }, callback
      (user, callback) ->
        User.find(user.id).update name: null, (error, count) ->
          return callback error if error
          count.should.be.equal 1
          callback null, user.id
      (id, callback) -> User.find id, callback
      (user, callback) ->
        if _g.connection.User.eliminate_null
          user.should.have.keys 'id'
        else
          user.should.have.keys 'id', 'name'
        #TODO should.not.exist user.name
        callback null
    ], done
