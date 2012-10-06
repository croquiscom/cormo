should = require 'should'
async = require 'async'

module.exports = (models) ->
  it 'valid', (done) ->
    models.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      done null

  it 'invalid age', (done) ->
    models.User.create { name: 'John Doe', age: 10 }, (error, user) ->
      should.exist error
      error.message.should.be.equal 'too young'
      done null

  it 'invalid email', (done) ->
    models.User.create { name: 'John Doe', age: 27, email: 'invalid' }, (error, user) ->
      should.exist error
      error.message.should.be.equal 'invalid email'
      done null

  it 'invalid both', (done) ->
    models.User.create { name: 'John Doe', age: 10, email: 'invalid' }, (error, user) ->
      should.exist error
      if error.message isnt 'invalid email,too young'
        error.message.should.be.equal 'too young,invalid email'
      done null
