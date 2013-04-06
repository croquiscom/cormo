module.exports = ->
  it 'get associated object', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      _g.connection.Computer.create { brand: 'Maple', user_id: user.id }, (error, computer) ->
        return done error if error
        user.computer (error, record) ->
          return done error if error
          computer.should.eql record
          done null
