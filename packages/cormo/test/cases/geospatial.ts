import { expect } from 'chai';
import * as cormo from '../..';

export class PlaceRef extends cormo.BaseModel {
  public name?: string;
  public location!: [number, number];
}

async function _createPlaces(Place: typeof PlaceRef, data?: any) {
  if (!data) {
    data = [
      { name: 'Carrier Dome', location: [-76.136154, 43.036243] },
      { name: 'Eurosites Parc des Princes', location: [2.253051, 48.841419] },
      { name: 'Wimbledon', location: [-0.213428, 51.434784] },
      { name: 'Aloha Stadium', location: [-157.931976, 21.37232] },
      { name: 'Dodgers Stadium', location: [-118.241081, 34.073235] },
      { name: 'Candlestick Park', location: [-122.385002, 37.713715] },
      { name: 'Sanford Stadium', location: [-83.373383, 33.949738] },
      { name: 'Anfield Football Stadium', location: [-2.960837, 53.431557] },
      { name: 'Jamsil Baseball Stadium', location: [127.071793, 37.5121] },
      { name: 'The White House', location: [-77.036324, 38.897739] },
      { name: 'Palace of Versailles', location: [2.121782, 48.804722] },
      { name: 'Sapporo Dome', location: [141.40976, 43.015118] },
      { name: 'Tiananmen Square', location: [116.397667, 39.906017] },
    ];
  }
  data.sort(function () {
    return 0.5 - Math.random(); // random sort
  });
  return await Place.createBulk(data);
}

export default function (models: { Place: typeof PlaceRef; connection: cormo.Connection | null }) {
  it('valid geopoint', async function () {
    const place = await models.Place.create({
      name: 'Carrier Dome',
      location: [-76.136131, 43.03624],
    });
    const record = await models.Place.find(place.id);
    expect(record).to.have.property('name', 'Carrier Dome');
    expect(record).to.have.property('location');
    expect(record.location).to.be.an.instanceof(Array);
    expect(record.location).to.have.length(2);
    expect(record.location[0]).to.equal(-76.136131);
    expect(record.location[1]).to.equal(43.03624);
  });
  it('invalid geopoint', async function () {
    const data = [-76.136131, [], [-76.136131], [-76.136131, 43.03624, 10.59]];
    for (const item of data) {
      try {
        await models.Place.create({
          name: 'Carrier Dome',
          location: item as any,
        });
        throw new Error('must throw an error.');
      } catch (error: any) {
        expect(error).to.exist;
        expect(error).to.have.property('message', "'location' is not a geo point");
      }
    }
  });

  it('near query 1', async function () {
    await _createPlaces(models.Place);
    const places = await models.Place.query().near({ location: [-80, 40] });
    const expected = [
      'The White House',
      'Carrier Dome',
      'Sanford Stadium',
      'Dodgers Stadium',
      'Candlestick Park',
      'Anfield Football Stadium',
      'Aloha Stadium',
      'Wimbledon',
      'Palace of Versailles',
      'Eurosites Parc des Princes',
      'Tiananmen Square',
      'Jamsil Baseball Stadium',
      'Sapporo Dome',
    ];
    expect(places.map((place) => place.name)).to.eql(expected);
  });

  it('near query 2', async function () {
    await _createPlaces(models.Place);
    const places = await models.Place.query()
      .near({ location: [-5, 45] })
      .limit(4);
    const expected = ['Wimbledon', 'Palace of Versailles', 'Eurosites Parc des Princes', 'Anfield Football Stadium'];
    expect(places.map((place) => place.name)).to.eql(expected);
  });

  it('near query 3', async function () {
    await _createPlaces(models.Place);
    const places = await models.Place.query()
      .near({ location: [170, 45] })
      .limit(1);
    const expected = ['Sapporo Dome'];
    expect(places.map((place) => place.name)).to.eql(expected);
  });

  it('near query 4', async function () {
    await _createPlaces(models.Place);
    const places = await models.Place.query()
      .near({ location: [-80, 40] })
      .skip(3)
      .limit(3);
    const expected = ['Dodgers Stadium', 'Candlestick Park', 'Anfield Football Stadium'];
    expect(places.map((place) => place.name)).to.eql(expected);
  });

  it('near and condition', async function () {
    await _createPlaces(models.Place);
    const places = await models.Place.where({ name: { $contains: 'Stadium' } })
      .near({ location: [170, 45] })
      .limit(2);
    const expected = ['Jamsil Baseball Stadium', 'Anfield Football Stadium'];
    expect(places.map((place) => place.name)).to.eql(expected);
  });
}
