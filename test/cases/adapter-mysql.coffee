_g = require '../support/common'
{expect} = require 'chai'

module.exports = () ->
  describe 'issues', ->
    it 'reserved words', ->
      class Reference extends _g.Model
        @index group: 1
        @column 'group', 'integer'
      data = [
        { group: 1 }
        { group: 1 }
        { group: 2 }
        { group: 3 }
      ]
      records = await _g.connection.Reference.createBulk data
      record = await _g.connection.Reference.find(records[0].id).select('group')
      expect(record.id).to.eql records[0].id
      expect(record.group).to.eql records[0].group
      count = await _g.connection.Reference.count group: 1
      expect(count).to.eql 2
      return

    it '#5 invalid json value', ->
      class Test extends _g.Model
        @column 'name', String
      await Test.create name: 'croquis'
      Test.column 'object', type: Object, required: true
      Test.column 'array', type: [String], required: true
      records = await Test.where().lean(true)
      expect(records).to.eql [
        { id: records[0].id, name: 'croquis', object: null, array: null }
      ]
      return

  describe 'query', ->
    it 'basic', ->
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
      rows = await _g.connection.adapter.queryAsync "SELECT * FROM users WHERE age=?", [27]
      expect(rows).to.have.length 2
      expect(rows[0]).to.eql id: users[0].id, name: users[0].name, age: users[0].age
      expect(rows[1]).to.eql id: users[2].id, name: users[2].name, age: users[2].age
      return
