_g = require '../support/common'
{expect} = require 'chai'

module.exports = () ->
  it 'string length(function)', ->
    try
      class TypeOptionsString1 extends _g.Model
        @column 'col', _g.cormo.types.String(5)
    catch error
      # MongoDB, Sqlite3 does not support String type with length, just skip
      expect(error.message).to.eql 'this adapter does not support String type with length'
      return
    await _g.connection.applySchemas()
    await TypeOptionsString1.create col: '01234'
    try
      record = await TypeOptionsString1.create col: '0123456789'
    catch error
      return
    # MySQL non-strict mode accepts long string
    result = await TypeOptionsString1.find record.id
    expect(result.col).to.eql '01234'
    return

  it 'string length(string)', ->
    try
      class TypeOptionsString2 extends _g.Model
        @column 'col', 'string(5)'
    catch error
      # MongoDB, Sqlite3 does not support String type with length, just skip
      expect(error.message).to.eql 'this adapter does not support String type with length'
      return
    await _g.connection.applySchemas()
    await TypeOptionsString2.create col: '01234'
    try
      record = await TypeOptionsString2.create col: '0123456789'
    catch error
      return
    # MySQL non-strict mode accepts long string
    result = await TypeOptionsString2.find record.id
    expect(result.col).to.eql '01234'
    return
