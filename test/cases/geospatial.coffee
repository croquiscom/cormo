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
        record.should.have.property 'name', 'Carrier Dome'
        record.should.have.property 'location'
        record.location.should.be.an.instanceOf Array
        record.location.should.have.length 2
        record.location[0].should.equal -76.136131
        record.location[1].should.equal 43.036240
        done null

  it 'invalid geopoint', (done) ->
    data = [
      -76.136131
      []
      [ -76.136131 ]
      [ -76.136131, 43.036240, 10.59 ]
    ]
    _g.async.forEach data, (item, callback) ->
        _g.connection.Place.create name: 'Carrier Dome', location: item, (error, place) ->
          error.should.exist
          error.should.have.property 'message', "'location' is not a geo point"
          callback null
      , (error) ->
        done error

  it 'near query 1', (done) ->
    _createPlaces _g.connection.Place, (error) ->
      return done error if error
      _g.connection.Place.where().near(location: [-80, 40]).exec (error, places) ->
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
        places.should.eql expected
        done null

  it 'near query 2', (done) ->
    _createPlaces _g.connection.Place, (error) ->
      return done error if error
      _g.connection.Place.where().near(location: [-5, 45]).limit(4).exec (error, places) ->
        expected = [
          'Wimbledon'
          'Palace of Versailles'
          'Eurosites Parc des Princes'
          'Anfield Football Stadium'
        ]
        places = places.map (place) -> place.name
        places.should.eql expected
        done null

  it 'near query 3', (done) ->
    _createPlaces _g.connection.Place, (error) ->
      return done error if error
      _g.connection.Place.where().near(location: [170, 45]).limit(1).exec (error, places) ->
        expected = [
          'Sapporo Dome'
        ]
        places = places.map (place) -> place.name
        places.should.eql expected
        done null
