_g = require '../common'
async = require 'async'
{expect} = require 'chai'

module.exports = () ->
  it 'callbacks for a new record', (done) ->
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

    done null

  it 'callbacks for finding a record', (done) ->
    User = _g.connection.User

    User.createBulk [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
      { name: 'Alice Jackson', age: 27 }
    ], (error, users) ->
      User.afterFind 'after_find1'
      User::after_find1 = -> logs.push 'after_find1 : ' + @name
      User.afterFind -> logs.push 'after_find2 : ' + @name
      User.afterInitialize 'after_initialize1'
      User::after_initialize1 = -> logs.push 'after_initialize1 : ' + @name
      User.afterInitialize -> logs.push 'after_initialize2 : ' + @name

      logs = []
      User.find users[0].id, (error, user) ->
        expect(logs).to.eql [ 'after_find1 : John Doe', 'after_find2 : John Doe', 'after_initialize1 : John Doe', 'after_initialize2 : John Doe' ]
        done null

  it 'callbacks for finding records', (done) ->
    User = _g.connection.User

    async.mapSeries [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
      { name: 'Alice Jackson', age: 27 }
    ], (item, callback) ->
      _g.connection.User.create item, callback
    , (error, users) ->
      User.afterFind 'after_find1'
      User::after_find1 = -> logs.push 'after_find1 : ' + @name
      User.afterFind -> logs.push 'after_find2 : ' + @name
      User.afterInitialize 'after_initialize1'
      User::after_initialize1 = -> logs.push 'after_initialize1 : ' + @name
      User.afterInitialize -> logs.push 'after_initialize2 : ' + @name

      logs = []
      User.where age: 27, (error, users) ->
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
        done null

  it 'callbacks for creating a record', (done) ->
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
    User.create { name: 'John Doe', age: 27 }, (error, user) ->
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
      done null

  it 'callbacks for updating a record', (done) ->
    User = _g.connection.User

    User.create { name: 'John Doe', age: 27 }, (error, user) ->
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
      user.save (error, user) ->
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
        done null

  it 'callbacks for destroying a record', (done) ->
    User = _g.connection.User

    User.beforeDestroy 'before_destroy1'
    User::before_destroy1 = -> logs.push 'before_destroy1 : ' + @name
    User.beforeDestroy -> logs.push 'before_destroy2 : ' + @name
    User.afterDestroy 'after_destroy1'
    User::after_destroy1 = -> logs.push 'after_destroy1 : ' + @name
    User.afterDestroy -> logs.push 'after_destroy2 : ' + @name

    user = new User name: 'John Doe', age: 27

    logs = []
    user.destroy (error, user) ->
      expect(logs).to.eql [
        'before_destroy1 : John Doe'
        'before_destroy2 : John Doe'
        'after_destroy1 : John Doe'
        'after_destroy2 : John Doe'
      ]

      User.create { name: 'John Doe', age: 27 }, (error, user) ->
        logs = []
        user.destroy (error, user) ->
          expect(logs).to.eql [
            'before_destroy1 : John Doe'
            'before_destroy2 : John Doe'
            'after_destroy1 : John Doe'
            'after_destroy2 : John Doe'
          ]
          done null
