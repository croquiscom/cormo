_g = require '../support/common'
{expect} = require 'chai'
{ObjectId} = require 'mongodb'

module.exports = () ->
  describe 'issues', ->
    it 'insert more than 1000', ->
      class Simple extends _g.Model
        @column 'value', Number
      records = await _g.connection.Simple.createBulk [1..1500].map((i) -> value: i)
      for i in [1..1500]
        expect(records[i-1]).to.have.property 'value', i
      return

  describe 'collection', ->
    it 'find', ->
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
      users = await _g.connection.User.createBulk data
      cursor = await _g.connection.adapter.collection('User').find age: 27
      result = await cursor.toArray()
      expect(result).to.have.length 2
      expect(result[0]).to.eql _id: new ObjectId(users[0].id), name: users[0].name, age: users[0].age
      expect(result[1]).to.eql _id: new ObjectId(users[2].id), name: users[2].name, age: users[2].age
      return
