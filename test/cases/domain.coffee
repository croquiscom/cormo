_g = require '../support/common'
domain = require 'domain'
{expect} = require 'chai'

module.exports = () ->
  user = undefined

  before (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, record) ->
      user = record
      done error

  it 'Model.create', (done) ->
    d = domain.create()
    d.run ->
      _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
        expect(d).to.equal process.domain or 'no domain'
        done null

  it 'Model.find', (done) ->
    d = domain.create()
    d.run ->
      _g.connection.User.find user.id, (error, record) ->
        expect(d).to.equal process.domain or 'no domain'
        done null

  it 'Model::save', (done) ->
    d = domain.create()
    d.run ->
      _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
        user.name = 'Bill Smith'
        user.save (error) ->
          expect(d).to.equal process.domain or 'no domain'
          done null

  it 'Model::destroy', (done) ->
    d = domain.create()
    d.run ->
      _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
        user.destroy (error) ->
          expect(d).to.equal process.domain or 'no domain'
          done null

  it 'Model.where', (done) ->
    d = domain.create()
    d.run ->
      _g.connection.User.where age: 27, (error, users) ->
        expect(d).to.equal process.domain or 'no domain'
        done null

  it 'Model.count', (done) ->
    d = domain.create()
    d.run ->
      _g.connection.User.count (error, count) ->
        expect(d).to.equal process.domain or 'no domain'
        done null
