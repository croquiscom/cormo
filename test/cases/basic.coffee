module.exports = (models) ->
  it 'create one', (done) ->
    user = new models.User()
    user.name = 'John Doe'
    user.age = 27
    user.save (error) ->
      return done error if error
      user.should.have.property 'id'
      done null
