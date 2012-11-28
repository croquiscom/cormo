module.exports = (models) ->
  it 'created_at', (done) ->
    now = Date.now()
    models.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      user.should.have.property 'created_at'
      user.should.have.property 'updated_at'
      user.created_at.should.equal user.updated_at
      user.created_at.should.be.approximately now, 10
      done null

  it 'updated_at', (done) ->
    models.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      created_at = user.created_at
      setTimeout ->
        now = Date.now()
        user.age = 30
        user.save (error) ->
          return done error if error
          # created_at remains unchanged
          user.created_at.should.equal.created_at
          # updated_at is changed to the current date
          user.updated_at.should.be.approximately now, 10
          done null
      , 50
