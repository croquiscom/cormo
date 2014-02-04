{expect} = require 'chai'

module.exports = () ->
  it 'created_at', (done) ->
    now = Date.now()
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      expect(user).to.have.property 'created_at'
      expect(user).to.have.property 'updated_at'
      expect(user.created_at).to.equal user.updated_at
      expect(user.created_at).to.be.closeTo now, 10
      done null

  it 'updated_at', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      created_at = user.created_at
      setTimeout ->
        now = Date.now()
        user.age = 30
        user.save (error) ->
          return done error if error
          # created_at remains unchanged
          expect(user.created_at).to.equal.created_at
          # updated_at is changed to the current date
          expect(user.updated_at).to.be.closeTo now, 10
          done null
      , 50
