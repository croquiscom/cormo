_g = require './support/common'
{expect} = require 'chai'

_dbs = [ 'mysql', 'mongodb', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'geospatial-' + db, ->
    before ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      if _g.use_coffeescript_class
        class Place extends _g.BaseModel
          @column 'name', 'string'
          @column 'location', 'geopoint'
      else
        Place = _g.connection.model 'Place',
          name: String
          location: _g.cormo.types.GeoPoint

      await _g.connection.dropAllModels()
      return

    beforeEach ->
      await _g.deleteAllRecords [_g.connection.Place]
      return

    after ->
      await _g.connection.dropAllModels()
      _g.connection.close()
      _g.connection = null
      return

    require('./cases/geospatial')()

_dbs_not = [ 'sqlite3', 'sqlite3_memory' ]

_dbs_not.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'geospatial-' + db, ->
    before ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

    it 'does not support geospatial', ->
      expect( ->
        Place = _g.connection.model 'Place',
          name: String
          location: _g.cormo.types.GeoPoint
      ).to.throw 'this adapter does not support GeoPoint type'
      return
