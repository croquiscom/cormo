module.exports = () ->
  it 'valid', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      done null

  it 'invalid age', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 10 }, (error, user) ->
      should.exist error
      error.message.should.be.equal 'too young'
      done null

  it 'invalid email', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27, email: 'invalid' }, (error, user) ->
      should.exist error
      error.message.should.be.equal 'invalid email'
      done null

  it 'invalid both', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 10, email: 'invalid' }, (error, user) ->
      should.exist error
      if error.message isnt 'invalid email,too young'
        error.message.should.be.equal 'too young,invalid email'
      done null
