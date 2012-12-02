require './common'

_dbs =
  mysql:
    database: 'test'
  mongodb:
    database: 'test'

Object.keys(_dbs).forEach (db) ->
  describe 'geospatial-' + db, ->
    connection = undefined
    connect = (callback) ->
      connection = new Connection db, _dbs[db]
      if connection.connected
        callback()
      else
        connection.once 'connected', callback
        connection.once 'error', (error) ->
          callback error

    models = {}

    before (done) ->
      connect (error) ->
        return done error if error

        if Math.floor Math.random() * 2
          # using CoffeeScript extends keyword
          class Place extends Model
            @connection connection
            @column 'name', 'string'
            @column 'location', 'geopoint'
        else
          # using Connection method
          Place = connection.model 'Place',
            name: String
            location: cormo.types.GeoPoint

        models.Place = Place

        Place.drop (error) ->
          return done error if error
          done null

    beforeEach (done) ->
      models.Place.deleteAll (error) ->
        return done error if error
        done null

    after (done) ->
      models.Place.drop done

    require('./cases/geospatial')(models)

_dbs_not =
  sqlite3:
    database: __dirname + '/test.sqlite3'
  sqlite3_memory: {}
  postgresql:
    database: 'test'

Object.keys(_dbs_not).forEach (db) ->
  describe 'geospatial-' + db, ->
    connection = undefined
    connect = (callback) ->
      connection = new Connection db, _dbs_not[db]
      if connection.connected
        callback()
      else
        connection.once 'connected', callback
        connection.once 'error', (error) ->
          callback error

    before (done) ->
      connect done

    it 'does not support geospatial', (done) ->
      ( ->
        Place = connection.model 'Place',
          name: String
          location: cormo.types.GeoPoint
      ).should.throw 'this adapter does not support GeoPoint'
      done null
