_g = require '../support/common'
{expect} = require 'chai'

module.exports = () ->
  describe 'issues', ->
    it 'reserved words', (done) ->
      class Reference extends _g.Model
        @index group: 1
        @column 'group', 'integer'
      data = [
        { group: 1 }
        { group: 1 }
        { group: 2 }
        { group: 3 }
      ]
      _g.connection.Reference.createBulk data, (error, records) ->
        return done error if error
        _g.connection.Reference.find(records[0].id).select('group').exec (error, record) ->
          return done error if error
          expect(record.id).to.eql records[0].id
          expect(record.group).to.eql records[0].group
          _g.connection.Reference.count group: 1, (error, count) ->
            return done error if error
            expect(count).to.eql 2
            done null

  describe 'query', ->
    it 'basic', (done) ->
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
        _g.connection.adapter.query "SELECT * FROM users WHERE age=$1", [27], (error, result) ->
          return done error if error
          expect(result.rows).to.have.length 2
          expect(result.rows[0]).to.eql id: users[0].id, name: users[0].name, age: users[0].age
          expect(result.rows[1]).to.eql id: users[2].id, name: users[2].name, age: users[2].age
          done null
