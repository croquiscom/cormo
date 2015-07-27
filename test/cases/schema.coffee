_g = require '../support/common'
async = require 'async'
{expect} = require 'chai'

module.exports = () ->
  afterEach (done) ->
    _g.connection.dropAllModels ->
      done null

  it 'add index', (done) ->
    class User extends _g.Model
      @column 'name', String
      @column 'age', Number

    # can add same age without unique index
    User.create { name: 'John Doe', age: 27 }, (error, user1) ->
      return done error if error
      User.create { name: 'John Doe', age: 27 }, (error, user2) ->
        return done error if error

        user2.destroy (error) ->
          return done error if error

          # add unique index
          User.index { age: 1 }, unique: true

          _g.connection.applySchemas (error) ->
            return done error if error

            # can not add same age with unique index
            User.create { name: 'Jone Doe', age: 27 }, (error, user3) ->
              expect(error).to.exist
              # 'duplicated email' or 'duplicated'
              expect(error.message).to.match /^duplicated( age)?$/
              expect(user3).to.not.exist
              done null

  it 'applySchemas successes if an index already exist', (done) ->
    class User extends _g.Model
      @index { name: 1, age: 1 }
      @column 'name', String
      @column 'age', Number

    _g.connection.applySchemas (error) ->
      return done error if error

      User.column 'address', String

      _g.connection.applySchemas (error) ->
        return done error if error
        done null

  it 'add column', (done) ->
    class User extends _g.Model
      @column 'name', String
      @column 'age', Number

    _g.connection.applySchemas (error) ->
      return done error if error

      User.column 'address', String

      User.create { name: 'John Doe', age: 27, address: 'Moon' }, (error, user1) ->
        return done error if error

        User.find user1.id, (error, user2) ->
          return done error if error
          expect(user2).to.have.keys 'id', 'name', 'age', 'address'
          expect(user2.address).to.eql 'Moon'
          done null
