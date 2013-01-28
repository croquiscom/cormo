domain = require 'domain'

module.exports = () ->
  user = undefined

  before (done) ->
    connection.User.create { name: 'John Doe', age: 27 }, (error, record) ->
      user = record
      done null

  it 'Model.create', (done) ->
    d = domain.create()
    d.run ->
      connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
        d.should.equal process.domain or 'no domain'
        done null

  it 'Model.find', (done) ->
    d = domain.create()
    d.run ->
      connection.User.find user.id, (error, record) ->
        d.should.equal process.domain or 'no domain'
        done null

  it 'Model::save', (done) ->
    d = domain.create()
    d.run ->
      connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
        user.name = 'Bill Smith'
        user.save (error) ->
          d.should.equal process.domain or 'no domain'
          done null

  it 'Model::destroy', (done) ->
    d = domain.create()
    d.run ->
      connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
        user.destroy (error) ->
          d.should.equal process.domain or 'no domain'
          done null

  it 'Model.where', (done) ->
    d = domain.create()
    d.run ->
      connection.User.where age: 27, (error, users) ->
        d.should.equal process.domain or 'no domain'
        done null

  it 'Model.count', (done) ->
    d = domain.create()
    d.run ->
      connection.User.count (error, count) ->
        d.should.equal process.domain or 'no domain'
        done null
