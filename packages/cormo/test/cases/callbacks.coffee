_g = require '../support/common'
{expect} = require 'chai'

module.exports = () ->
  it 'callbacks for a new record', ->
    User = _g.connection.User

    User.afterFind 'after_find1'
    User::after_find1 = -> logs.push 'after_find1 : ' + @name
    User.afterFind -> logs.push 'after_find2 : ' + @name
    User.afterInitialize 'after_initialize1'
    User::after_initialize1 = -> logs.push 'after_initialize1 : ' + @name
    User.afterInitialize -> logs.push 'after_initialize2 : ' + @name

    logs = []
    user = new User name: 'John Doe', age: 27

    expect(logs).to.eql [ 'after_initialize1 : John Doe', 'after_initialize2 : John Doe' ]

    return

  it 'callbacks for finding a record', ->
    User = _g.connection.User

    users = await User.createBulk [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
      { name: 'Alice Jackson', age: 27 }
    ]
    User.afterFind 'after_find1'
    User::after_find1 = -> logs.push 'after_find1 : ' + @name
    User.afterFind -> logs.push 'after_find2 : ' + @name
    User.afterInitialize 'after_initialize1'
    User::after_initialize1 = -> logs.push 'after_initialize1 : ' + @name
    User.afterInitialize -> logs.push 'after_initialize2 : ' + @name

    logs = []
    user = await User.find users[0].id
    expect(logs).to.eql [ 'after_find1 : John Doe', 'after_find2 : John Doe', 'after_initialize1 : John Doe', 'after_initialize2 : John Doe' ]
    return

  it 'callbacks for finding records', ->
    User = _g.connection.User

    user1 = await _g.connection.User.create { name: 'John Doe', age: 27 }
    user2 = await _g.connection.User.create { name: 'Bill Smith', age: 45 }
    user3 = await _g.connection.User.create { name: 'Alice Jackson', age: 27 }
    User.afterFind 'after_find1'
    User::after_find1 = -> logs.push 'after_find1 : ' + @name
    User.afterFind -> logs.push 'after_find2 : ' + @name
    User.afterInitialize 'after_initialize1'
    User::after_initialize1 = -> logs.push 'after_initialize1 : ' + @name
    User.afterInitialize -> logs.push 'after_initialize2 : ' + @name

    logs = []
    await User.where age: 27
    expect(logs).to.eql [
      'after_find1 : John Doe'
      'after_find2 : John Doe'
      'after_initialize1 : John Doe'
      'after_initialize2 : John Doe'
      'after_find1 : Alice Jackson'
      'after_find2 : Alice Jackson'
      'after_initialize1 : Alice Jackson'
      'after_initialize2 : Alice Jackson'
    ]
    return

  it 'callbacks for creating a record', ->
    User = _g.connection.User

    User.beforeValidate 'before_validate1'
    User::before_validate1 = -> logs.push 'before_validate1 : ' + @name
    User.beforeValidate -> logs.push 'before_validate2 : ' + @name
    User.afterValidate 'after_validate1'
    User::after_validate1 = -> logs.push 'after_validate1 : ' + @name
    User.afterValidate -> logs.push 'after_validate2 : ' + @name

    User.beforeSave 'before_save1'
    User::before_save1 = -> logs.push 'before_save1 : ' + @name
    User.beforeSave -> logs.push 'before_save2 : ' + @name
    User.afterSave 'after_save1'
    User::after_save1 = -> logs.push 'after_save1 : ' + @name
    User.afterSave -> logs.push 'after_save2 : ' + @name

    User.beforeCreate 'before_create1'
    User::before_create1 = -> logs.push 'before_create1 : ' + @name
    User.beforeCreate -> logs.push 'before_create2 : ' + @name
    User.afterCreate 'after_create1'
    User::after_create1 = -> logs.push 'after_create1 : ' + @name
    User.afterCreate -> logs.push 'after_create2 : ' + @name

    User.beforeUpdate 'before_update1'
    User::before_update1 = -> logs.push 'before_update1 : ' + @name
    User.beforeUpdate -> logs.push 'before_update2 : ' + @name
    User.afterUpdate 'after_update1'
    User::after_update1 = -> logs.push 'after_update1 : ' + @name
    User.afterUpdate -> logs.push 'after_update2 : ' + @name

    logs = []
    user = await User.create { name: 'John Doe', age: 27 }
    expect(logs).to.eql [
      'before_validate1 : John Doe'
      'before_validate2 : John Doe'
      'after_validate1 : John Doe'
      'after_validate2 : John Doe'
      'before_save1 : John Doe'
      'before_save2 : John Doe'
      'before_create1 : John Doe'
      'before_create2 : John Doe'
      'after_create1 : John Doe'
      'after_create2 : John Doe'
      'after_save1 : John Doe'
      'after_save2 : John Doe'
    ]
    return

  it 'callbacks for updating a record', ->
    User = _g.connection.User

    user = await User.create { name: 'John Doe', age: 27 }
    User.beforeValidate 'before_validate1'
    User::before_validate1 = -> logs.push 'before_validate1 : ' + @name
    User.beforeValidate -> logs.push 'before_validate2 : ' + @name
    User.afterValidate 'after_validate1'
    User::after_validate1 = -> logs.push 'after_validate1 : ' + @name
    User.afterValidate -> logs.push 'after_validate2 : ' + @name

    User.beforeSave 'before_save1'
    User::before_save1 = -> logs.push 'before_save1 : ' + @name
    User.beforeSave -> logs.push 'before_save2 : ' + @name
    User.afterSave 'after_save1'
    User::after_save1 = -> logs.push 'after_save1 : ' + @name
    User.afterSave -> logs.push 'after_save2 : ' + @name

    User.beforeCreate 'before_create1'
    User::before_create1 = -> logs.push 'before_create1 : ' + @name
    User.beforeCreate -> logs.push 'before_create2 : ' + @name
    User.afterCreate 'after_create1'
    User::after_create1 = -> logs.push 'after_create1 : ' + @name
    User.afterCreate -> logs.push 'after_create2 : ' + @name

    User.beforeUpdate 'before_update1'
    User::before_update1 = -> logs.push 'before_update1 : ' + @name
    User.beforeUpdate -> logs.push 'before_update2 : ' + @name
    User.afterUpdate 'after_update1'
    User::after_update1 = -> logs.push 'after_update1 : ' + @name
    User.afterUpdate -> logs.push 'after_update2 : ' + @name

    logs = []
    user.name = 'Alice Jackson'
    await user.save()
    expect(logs).to.eql [
      'before_validate1 : Alice Jackson'
      'before_validate2 : Alice Jackson'
      'after_validate1 : Alice Jackson'
      'after_validate2 : Alice Jackson'
      'before_save1 : Alice Jackson'
      'before_save2 : Alice Jackson'
      'before_update1 : Alice Jackson'
      'before_update2 : Alice Jackson'
      'after_update1 : Alice Jackson'
      'after_update2 : Alice Jackson'
      'after_save1 : Alice Jackson'
      'after_save2 : Alice Jackson'
    ]
    return

  it 'callbacks for destroying a record', ->
    User = _g.connection.User

    User.beforeDestroy 'before_destroy1'
    User::before_destroy1 = -> logs.push 'before_destroy1 : ' + @name
    User.beforeDestroy -> logs.push 'before_destroy2 : ' + @name
    User.afterDestroy 'after_destroy1'
    User::after_destroy1 = -> logs.push 'after_destroy1 : ' + @name
    User.afterDestroy -> logs.push 'after_destroy2 : ' + @name

    user = new User name: 'John Doe', age: 27

    logs = []
    await user.destroy()
    expect(logs).to.eql [
      'before_destroy1 : John Doe'
      'before_destroy2 : John Doe'
      'after_destroy1 : John Doe'
      'after_destroy2 : John Doe'
    ]

    user = await User.create { name: 'John Doe', age: 27 }
    logs = []
    await user.destroy()
    expect(logs).to.eql [
      'before_destroy1 : John Doe'
      'before_destroy2 : John Doe'
      'after_destroy1 : John Doe'
      'after_destroy2 : John Doe'
    ]
    return
