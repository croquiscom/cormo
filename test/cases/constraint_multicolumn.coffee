_g = require '../support/common'
{expect} = require 'chai'

module.exports = () ->
  it 'unique', ->
    await _g.connection.Version.create major: 1, minor: 1
    try
      await _g.connection.Version.create major: 1, minor: 1
      throw new Error 'must throw an error.'
    catch error
      # 'duplicated email' or 'duplicated'
      expect(error.message).to.match /^duplicated( major_minor)?$/
      expect(error).to.exist
    return

  it 'each can duplicate', ->
    await _g.connection.Version.create major: 1, minor: 1
    await _g.connection.Version.create major: 1, minor: 2
    return

  it 'can have two null records', ->
    await _g.connection.Version.create {}
    await _g.connection.Version.create {}
    return
