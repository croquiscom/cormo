require './common'
{expect} = require 'chai'

_dbs =
  mysql:
    database: 'test'
  mongodb:
    database: 'test'

Object.keys(_dbs).forEach (db) ->
  describe 'geospatial-' + db, ->
    before (done) ->
      _g.connection = new _g.Connection db, _dbs[db]

      if Math.floor Math.random() * 2
        # using CoffeeScript extends keyword
        class Place extends _g.Model
          @column 'name', 'string'
          @column 'location', 'geopoint'
      else
        # using Connection method
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

_dbs_not =
  sqlite3:
    database: __dirname + '/test.sqlite3'
  sqlite3_memory: {}
  postgresql:
    database: 'test'

Object.keys(_dbs_not).forEach (db) ->
  describe 'geospatial-' + db, ->
    before ->
      _g.connection = new _g.Connection db, _dbs_not[db]

    it 'does not support geospatial', (done) ->
      expect( ->
        Place = _g.connection.model 'Place',
          name: String
          location: _g.cormo.types.GeoPoint
      ).to.throw 'this adapter does not support GeoPoint'
      done null
