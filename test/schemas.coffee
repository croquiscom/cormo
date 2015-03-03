_g = require './common'
{expect} = require 'chai'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql', 'redis' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'schemas-' + db, ->
    it 'association order', ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      class Ace extends _g.Model
        @hasOne 'car', integrity: 'delete'
        @belongsTo 'bear'

      class Bear extends _g.Model
        @hasMany 'aces', integrity: 'delete'
        @belongsTo 'dog'

      class Car extends _g.Model
        @belongsTo 'bear'

      class Dog extends _g.Model
        @hasMany 'aces', integrity: 'delete'

      _g.connection.applySchemas()
      .then ->
        _g.connection.Car.drop()
      .then ->
        _g.connection.Ace.drop()
      .then ->
        _g.connection.Bear.drop()
      .then ->
        _g.connection.Dog.drop()

    afterEach ->
      _g.connection.close()
      _g.connection = null
