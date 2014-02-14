require './common'
{expect} = require 'chai'

_dbs = [ 'mysql', 'mongodb' ]

_dbs.forEach (db) ->
  describe 'geospatial-' + db, ->
    before (done) ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      if _g.use_coffeescript_class
        class Place extends _g.Model
          @column 'name', 'string'
          @column 'location', 'geopoint'
      else
        Place = _g.connection.model 'Place',
          name: String
          location: _g.cormo.types.GeoPoint

      _g.dropModels [Place], done

    beforeEach (done) ->
      _g.deleteAllRecords [_g.connection.Place], done

    after (done) ->
      _g.dropModels [_g.connection.Place], ->
        _g.connection.close()
        _g.connection = null
        done null

    require('./cases/geospatial')()

_dbs_not = [ 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs_not.forEach (db) ->
  describe 'geospatial-' + db, ->
    before ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

    it 'does not support geospatial', (done) ->
      expect( ->
        Place = _g.connection.model 'Place',
          name: String
          location: _g.cormo.types.GeoPoint
      ).to.throw 'this adapter does not support GeoPoint'
      done null
