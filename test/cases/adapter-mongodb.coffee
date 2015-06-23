_g = require '../support/common'
{expect} = require 'chai'
{ObjectId} = require 'mongodb'

module.exports = () ->
  describe 'collection', ->
    it 'find', (done) ->
      class User extends _g.Model
        @column 'name', String
        @column 'age', Number
      data = [
        { name: 'John Doe', age: 27 }
        { name: 'Bill Smith', age: 45 }
        { name: 'Alice Jackson', age: 27 }
        { name: 'Gina Baker', age: 32 }
        { name: 'Daniel Smith', age: 8 }
      ]
      _g.connection.User.createBulk data, (error, users) ->
        return done error if error
        _g.connection.adapter.collection('User').find age: 27, (error, cursor) ->
          return done error if error
          cursor.toArray (error, result) ->
            return done error if error
            expect(result).to.have.length 2
            expect(result[0]).to.eql _id: new ObjectId(users[0].id), name: users[0].name, age: users[0].age
            expect(result[1]).to.eql _id: new ObjectId(users[2].id), name: users[2].name, age: users[2].age
            done null
