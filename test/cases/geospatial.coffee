_g = require '../support/common'
{expect} = require 'chai'

_createPlaces = (Place, data) ->
  if not data
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
  await Place.createBulk data

module.exports = () ->
  it 'valid geopoint', ->
    place = await _g.connection.Place.create name: 'Carrier Dome', location: [-76.136131, 43.036240]
    record = await _g.connection.Place.find place.id
    expect(record).to.have.property 'name', 'Carrier Dome'
    expect(record).to.have.property 'location'
    expect(record.location).to.be.an.instanceof Array
    expect(record.location).to.have.length 2
    expect(record.location[0]).to.equal -76.136131
    expect(record.location[1]).to.equal 43.036240
    return

  it 'invalid geopoint', ->
    data = [
      -76.136131
      []
      [ -76.136131 ]
      [ -76.136131, 43.036240, 10.59 ]
    ]
    for item in data
      try
        await _g.connection.Place.create name: 'Carrier Dome', location: item
        throw new Error 'must throw an error.'
      catch error
        expect(error).to.exist
        expect(error).to.have.property 'message', "'location' is not a geo point"
    return

  it 'near query 1', ->
    await _createPlaces _g.connection.Place
    places = await _g.connection.Place.query().near(location: [-80, 40])
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
    return

  it 'near query 2', ->
    await _createPlaces _g.connection.Place
    places = await _g.connection.Place.query().near(location: [-5, 45]).limit(4)
    expected = [
      'Wimbledon'
      'Palace of Versailles'
      'Eurosites Parc des Princes'
      'Anfield Football Stadium'
    ]
    places = places.map (place) -> place.name
    expect(places).to.eql expected
    return

  it 'near query 3', ->
    await _createPlaces _g.connection.Place
    places = await _g.connection.Place.query().near(location: [170, 45]).limit(1)
    expected = [
      'Sapporo Dome'
    ]
    places = places.map (place) -> place.name
    expect(places).to.eql expected
    return

  it 'near query 4', ->
    await _createPlaces _g.connection.Place
    places = await _g.connection.Place.query().near(location: [-80, 40]).skip(3).limit(3)
    expected = [
      'Dodgers Stadium'
      'Candlestick Park'
      'Anfield Football Stadium'
    ]
    places = places.map (place) -> place.name
    expect(places).to.eql expected
    return

  it 'near and condition', ->
    await _createPlaces _g.connection.Place
    places = await _g.connection.Place.where(name: $contains: 'Stadium').near(location: [170, 45]).limit(2)
    expected = [
      'Jamsil Baseball Stadium'
      'Anfield Football Stadium'
    ]
    places = places.map (place) -> place.name
    expect(places).to.eql expected
    return
