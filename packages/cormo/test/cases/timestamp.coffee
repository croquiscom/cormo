_g = require '../support/common'
{expect} = require 'chai'

module.exports = () ->
  it 'created_at', ->
    now = Date.now()
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    expect(user).to.have.property 'created_at'
    expect(user).to.have.property 'updated_at'
    expect(user.created_at).to.equal user.updated_at
    expect(user.created_at?.getTime()).to.be.closeTo now, 10
    return

  it 'updated_at', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    created_at = user.created_at
    await new Promise (resolve, reject) =>
      setTimeout ->
        resolve()
      , 50
    now = Date.now()
    user.age = 30
    await user.save()
    # created_at remains unchanged
    expect(user.created_at.getTime()).to.equal created_at.getTime()
    # updated_at is changed to the current date
    expect(user.updated_at?.getTime()).to.be.closeTo now, 10
    return
