_g = require '../support/common'
{expect} = require 'chai'

module.exports = () ->
  describe 'issues', ->
    it 'reserved words', ->
      class Reference extends _g.BaseModel
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
      class Test extends _g.BaseModel
        @column 'name', String
        @column 'object', type: Object, required: true
        @column 'array', type: [String], required: true
      await _g.connection.applySchemas()
      await _g.connection.adapter.run "INSERT INTO tests (name, object, array) VALUES ('croquis', '', '')"
      records = await Test.where().lean(true)
      expect(records).to.eql [
        { id: records[0].id, name: 'croquis', object: null, array: null }
      ]
      return
