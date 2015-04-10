_g = require '../support/common'
async = require 'async'
{expect} = require 'chai'

_createPlaces = (Place, data, callback) ->
  if typeof data is 'function'
    callback = data
    data = [
      { name: 'Carrier Dome', location: [-76.136154,43.036243] }
      { name: 'Eurosites Parc des Princes', location: [2.253051,48.841419] }
      { name: 'Wimbledon', location: [-0.213428,51.434784] }
      { name: 'Aloha Stadium', location: [-157.931976,21.372320] }
      { name: 'Dodgers Stadium', location: [-118.241081,34.073235] }
      { name: 'Candlestick Park', location: [-122.385002,37.713715] }
      { name: 'Sanford Stadium', location: [-83.373383,33.949738] }
      { name: 'Anfield Football Stadium', location: [-2.960837,53.431557] }
      { name: 'Jamsil Baseball Stadium', location: [127.071793,37.512100] }
      { name: 'The White House', location: [-77.036324,38.897739] }
      { name: 'Palace of Versailles', location: [2.121782,48.804722] }
      { name: 'Sapporo Dome', location: [141.409760,43.015118] }
      { name: 'Tiananmen Square', location: [116.397667,39.906017] }
    ]
  data.sort -> 0.5 - Math.random() # random sort
  Place.createBulk data, callback

module.exports = () ->
  it 'valid geopoint', (done) ->
    _g.connection.Place.create name: 'Carrier Dome', location: [-76.136131, 43.036240], (error, place) ->
      return done error if error
      _g.connection.Place.find place.id, (error, record) ->
        return done error if error
        expect(record).to.have.property 'name', 'Carrier Dome'
        expect(record).to.have.property 'location'
        expect(record.location).to.be.an.instanceof Array
        expect(record.location).to.have.length 2
        expect(record.location[0]).to.equal -76.136131
        expect(record.location[1]).to.equal 43.036240
        done null

  it 'invalid geopoint', (done) ->
    data = [
      -76.136131
      []
      [ -76.136131 ]
      [ -76.136131, 43.036240, 10.59 ]
    ]
    async.forEach data, (item, callback) ->
      _g.connection.Place.create name: 'Carrier Dome', location: item, (error, place) ->
        expect(error).to.exist
        expect(error).to.have.property 'message', "'location' is not a geo point"
        callback null
    , (error) ->
      done error

  it 'near query 1', (done) ->
    _createPlaces _g.connection.Place, (error) ->
      return done error if error
      _g.connection.Place.query().near(location: [-80, 40]).exec (error, places) ->
        return done error if error
        expected = [
          'The White House'
          'Carrier Dome'
          'Sanford Stadium'
          'Dodgers Stadium'
          'Candlestick Park'
          'Anfield Football Stadium'
          'Aloha Stadium'
          'Wimbledon'
          'Palace of Versailles'
          'Eurosites Parc des Princes'
          'Tiananmen Square'
          'Jamsil Baseball Stadium'
          'Sapporo Dome'
        ]
        places = places.map (place) -> place.name
        expect(places).to.eql expected
        done null

  it 'near query 2', (done) ->
    _createPlaces _g.connection.Place, (error) ->
      return done error if error
      _g.connection.Place.query().near(location: [-5, 45]).limit(4).exec (error, places) ->
        return done error if error
        expected = [
          'Wimbledon'
          'Palace of Versailles'
          'Eurosites Parc des Princes'
          'Anfield Football Stadium'
        ]
        places = places.map (place) -> place.name
        expect(places).to.eql expected
        done null

  it 'near query 3', (done) ->
    _createPlaces _g.connection.Place, (error) ->
      return done error if error
      _g.connection.Place.query().near(location: [170, 45]).limit(1).exec (error, places) ->
        return done error if error
        expected = [
          'Sapporo Dome'
        ]
        places = places.map (place) -> place.name
        expect(places).to.eql expected
        done null

  it 'near query 4', (done) ->
    _createPlaces _g.connection.Place, (error) ->
      return done error if error
      _g.connection.Place.query().near(location: [-80, 40]).skip(3).limit(3).exec (error, places) ->
        return done error if error
        expected = [
          'Dodgers Stadium'
          'Candlestick Park'
          'Anfield Football Stadium'
        ]
        places = places.map (place) -> place.name
        expect(places).to.eql expected
        done null

  it 'near and condition', (done) ->
    _createPlaces _g.connection.Place, (error) ->
      return done error if error
      _g.connection.Place.where(name: $contains: 'Stadium').near(location: [170, 45]).limit(2).exec (error, places) ->
        return done error if error
        expected = [
          'Jamsil Baseball Stadium'
          'Anfield Football Stadium'
        ]
        places = places.map (place) -> place.name
        expect(places).to.eql expected
        done null
