import { expect } from 'chai';
import * as cormo from '../..';

import { Type } from './type';

export default function (models: { Type: typeof Type; connection: cormo.Connection | null }) {
  it('number on Model.update', async () => {
    const data = [
      ['30', 30],
      ['12.8', 12.8],
      ['8a', null],
      ['abc', null],
    ];
    for (const item of data) {
      let type = await models.Type.create();
      try {
        const count = await models.Type.find(type.id).update({ number: item[0] });
        if (item[1] === null) {
          throw new Error('must throw an error.');
        }
        expect(count).to.equal(1);
        type = await models.Type.find(type.id);
        expect(type.number).to.equal(item[1]);
      } catch (error: any) {
        expect(error).to.exist;
        expect(error.message).to.equal("'number' is not a number");
      }
    }
  });

  it('integer on Model.update', async () => {
    const data = [
      ['30', 30],
      ['9876543210', null],
      ['12.8', null],
      ['8a', null],
      ['abc', null],
    ];
    for (const item of data) {
      let type = await models.Type.create();
      try {
        const count = await models.Type.find(type.id).update({ int_c: item[0] });
        if (item[1] === null) {
          throw new Error('must throw an error.');
        }
        expect(count).to.equal(1);
        type = await models.Type.find(type.id);
        expect(type.int_c).to.equal(item[1]);
      } catch (error: any) {
        expect(error).to.exist;
        expect(error.message).to.equal("'int_c' is not an integer");
      }
    }
  });

  it('date on Model.update', async () => {
    const data = [
      ['2012/10/12 21:32:54', new Date('2012/10/12 21:32:54').getTime()],
      ['2012-09-11 20:31:53', new Date('2012/09/11 20:31:53').getTime()],
      ['2012/11/02', new Date('2012/11/02 00:00:00').getTime()],
      ['2012/10/12 34:00:00', null],
      ['2012/13/01', null],
      [new Date('2013/01/12 03:42:21').getTime(), new Date('2013/01/12 03:42:21').getTime()],
    ];
    for (const item of data) {
      let type = await models.Type.create();
      try {
        const count = await models.Type.find(type.id).update({ date: item[0] });
        if (item[1] === null) {
          throw new Error('must throw an error.');
        }
        expect(count).to.equal(1);
        type = await models.Type.find(type.id);
        expect(type.date).to.be.an.instanceof(Date);
        expect(type.date!.getTime()).to.equal(item[1]);
      } catch (error: any) {
        expect(error).to.exist;
        expect(error.message).to.equal("'date' is not a date");
      }
    }
  });

  it('boolean on Model.update', async () => {
    const data = [
      [true, true],
      [false, false],
      ['str', null],
      [5, null],
    ];
    for (const item of data) {
      let type = await models.Type.create();
      try {
        const count = await models.Type.find(type.id).update({ boolean: item[0] });
        if (item[1] === null) {
          throw new Error('must throw an error.');
        }
        expect(count).to.equal(1);
        type = await models.Type.find(type.id);
        expect(type.boolean).to.equal(item[1]);
      } catch (error: any) {
        expect(error).to.exist;
        expect(error.message).to.equal("'boolean' is not a boolean");
      }
    }
  });

  it('object on Model.update', async () => {
    const data = [
      ['30', '30'],
      [30, 30],
      [true, true],
      [false, false],
      [
        { a: 5, b: ['oh'] },
        { a: 5, b: ['oh'] },
      ],
    ];
    for (const item of data) {
      let type = await models.Type.create();
      const count = await models.Type.find(type.id).update({ object: item[0] });
      expect(count).to.equal(1);
      type = await models.Type.find(type.id);
      if (typeof item[1] === 'object') {
        expect(type.object).to.eql(item[1]);
      } else {
        expect(type.object).to.equal(item[1]);
      }
    }
  });

  it('array of integer on Model.update', async () => {
    const data = [
      [
        [9, '30'],
        [9, 30],
      ],
      [9, null],
      [[9, '12.8'], null],
    ];
    for (const item of data) {
      let type = await models.Type.create();
      try {
        const count = await models.Type.find(type.id).update({ int_array: item[0] });
        if (item[1] === null) {
          throw new Error('must throw an error.');
        }
        expect(count).to.equal(1);
        type = await models.Type.find(type.id);
        expect(type.int_array).to.eql(item[1]);
      } catch (error: any) {
        expect(error).to.exist;
        expect(error.message).to.equal("'int_array' is not an array");
      }
    }
  });
}
