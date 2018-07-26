_g = require '../support/common'
{expect} = require 'chai'

module.exports = ->
  it 'get associated object', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    computer = await _g.connection.Computer.create { brand: 'Maple', user_id: user.id }
    record = await user.computer()
    expect(computer).to.eql record
    return
