import { expect, it } from 'vitest';
import * as cormo from '../../src/index.js';

export class Type extends cormo.BaseModel {
  public number?: number;
  public int_c?: number;
  public bigint_c?: number;
  public date?: Date;
  public boolean?: boolean;
  public object?: object;
  public string?: string;
  public int_array?: number[];
  public recordid?: any;
  public recordid_array?: any[];
  public text?: string;
  public blob?: Buffer;
}

export default function (models: { Type: typeof Type; connection: cormo.Connection | null }) {
  it('number', async () => {
    const data = [
      ['30', 30],
      ['12.8', 12.8],
      ['8a', null],
      ['abc', null],
    ];
    for (const item of data) {
      try {
        let type = await models.Type.create({ number: item[0] as any });
        if (item[1] === null) {
          throw new Error('must throw an error.');
        }
        expect(type.number).toBe(item[1]);
        type = await models.Type.find(type.id);
        expect(type.number).toBe(item[1]);
      } catch (error: any) {
        expect(error).toExist();
        expect(error.message).toBe("'number' is not a number");
      }
    }
  });

  it('integer', async () => {
    const data = [
      ['30', 30],
      ['9876543210', null],
      ['12.8', null],
      ['8a', null],
      ['abc', null],
    ];
    for (const item of data) {
      try {
        let type = await models.Type.create({ int_c: item[0] as any });
        if (item[1] === null) {
          throw new Error('must throw an error.');
        }
        expect(type.int_c).toBe(item[1]);
        type = await models.Type.find(type.id);
        expect(type.int_c).toBe(item[1]);
      } catch (error: any) {
        expect(error).toExist();
        expect(error.message).toBe("'int_c' is not an integer");
      }
    }
  });

  it('biginteger', async () => {
    const data = [
      ['30', 30],
      ['9876543210', 9876543210],
      ['12.8', null],
      ['8a', null],
      ['abc', null],
    ];
    for (const item of data) {
      try {
        let type = await models.Type.create({ bigint_c: item[0] as any });
        if (item[1] === null) {
          throw new Error('must throw an error.');
        }
        expect(type.bigint_c).toBe(item[1]);
        type = await models.Type.find(type.id);
        expect(type.bigint_c).toBe(item[1]);
      } catch (error: any) {
        expect(error).toExist();
        expect(error.message).toBe("'bigint_c' is not a big integer");
      }
    }
  });

  it('date', async () => {
    const data = [
      ['2012/10/12 21:32:54', new Date('2012/10/12 21:32:54').getTime()],
      ['2012-09-11 20:31:53', new Date('2012/09/11 20:31:53').getTime()],
      ['2012/11/02', new Date('2012/11/02 00:00:00').getTime()],
      ['2012/10/12 34:00:00', null],
      ['2012/13/01', null],
      [new Date('2013/01/12 03:42:21').getTime(), new Date('2013/01/12 03:42:21').getTime()],
    ];
    for (const item of data) {
      try {
        let type = await models.Type.create({ date: item[0] as any });
        if (item[1] === null) {
          throw new Error('must throw an error.');
        }
        expect(type.date).toBeInstanceOf(Date);
        expect(type.date!.getTime()).toBe(item[1]);
        type = await models.Type.find(type.id);
        expect(type.date).toBeInstanceOf(Date);
        expect(type.date!.getTime()).toBe(item[1]);
      } catch (error: any) {
        expect(error).toExist();
        expect(error.message).toBe("'date' is not a date");
      }
    }
  });

  it('date with fractional seconds', async () => {
    if (!(models.connection!.adapter as any).support_fractional_seconds) {
      return;
    }
    const data: Array<[string, number | null]> = [
      ['2012/10/12 21:32:54.123', new Date('2012/10/12 21:32:54.123').getTime()],
      ['2012/10/12 21:32:54.619', new Date('2012/10/12 21:32:54.619').getTime()],
    ];
    for (const item of data) {
      try {
        let type = await models.Type.create({ date: item[0] as any });
        if (item[1] === null) {
          throw new Error('must throw an error.');
        }
        expect(type.date).toBeInstanceOf(Date);
        expect(type.date!.getTime()).toBe(item[1]);
        type = await models.Type.find(type.id);
        expect(type.date).toBeInstanceOf(Date);
        expect(type.date!.getTime()).toBe(item[1]);
      } catch (error: any) {
        expect(error).toExist();
        expect(error.message).toBe("'date' is not a date");
      }
    }
  });

  it('boolean', async () => {
    const data = [
      [true, true],
      [false, false],
      ['str', null],
      [5, null],
    ];
    for (const item of data) {
      try {
        let type = await models.Type.create({ boolean: item[0] as any });
        if (item[1] === null) {
          throw new Error('must throw an error.');
        }
        expect(type.boolean).toBe(item[1]);
        type = await models.Type.find(type.id);
        expect(type.boolean).toBe(item[1]);
      } catch (error: any) {
        expect(error).toExist();
        expect(error.message).toBe("'boolean' is not a boolean");
      }
    }
  });

  it('object', async () => {
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
      let type = await models.Type.create({ object: item[0] as any });
      if (typeof item[1] === 'object') {
        expect(type.object).toEqual(item[1]);
      } else {
        expect(type.object).toBe(item[1]);
      }
      type = await models.Type.find(type.id);
      if (typeof item[1] === 'object') {
        expect(type.object).toEqual(item[1]);
      } else {
        expect(type.object).toBe(item[1]);
      }
    }
  });

  it('array of integer', async () => {
    const data = [
      [
        [9, '30'],
        [9, 30],
      ],
      [9, null],
      [[9, '12.8'], null],
    ];
    for (const item of data) {
      try {
        let type = await models.Type.create({ int_array: item[0] as any });
        if (item[1] === null) {
          throw new Error('must throw an error.');
        }
        expect(type.int_array).toEqual(item[1]);
        type = await models.Type.find(type.id);
        expect(type.int_array).toEqual(item[1]);
      } catch (error: any) {
        expect(error).toExist();
        expect(error.message).toBe("'int_array' is not an array");
      }
    }
  });

  it('null array is queryable with $not: null', async () => {
    await models.Type.create({ int_array: [1, 2, 3] });
    await models.Type.create({ int_array: null as any });

    const with_value = await models.Type.where({ int_array: { $not: null } });
    expect(with_value).toHaveLength(1);
    expect(with_value[0].int_array).toEqual([1, 2, 3]);

    const without_value = await models.Type.where({ int_array: null });
    expect(without_value).toHaveLength(1);
    expect(without_value[0].int_array).toBe(null);
  });

  it('null object is queryable with $not: null', async () => {
    await models.Type.create({ object: { a: 1 } });
    await models.Type.create({ object: null as any });

    const with_value = await models.Type.where({ object: { $not: null } });
    expect(with_value).toHaveLength(1);
    expect(with_value[0].object).toEqual({ a: 1 });

    const without_value = await models.Type.where({ object: null });
    expect(without_value).toHaveLength(1);
    expect(without_value[0].object).toBe(null);
  });

  it('recordid', async () => {
    const types = await models.Type.createBulk([{ int_c: 1 }]);
    const type = await models.Type.create({ recordid: types[0].id });
    const record = await models.Type.find(type.id);
    const record_lean = await models.Type.find(type.id).lean();
    expect(type.recordid).toEqual(types[0].id);
    expect(record.recordid).toEqual(types[0].id);
    expect(record_lean.recordid).toEqual(types[0].id);
  });

  it('recordid: query as string', async () => {
    const types = await models.Type.createBulk([{ int_c: 1 }]);
    models.Type.query_record_id_as_string = true;
    const type = await models.Type.create({ recordid: types[0].id });
    const type_bulk = await models.Type.createBulk([{ recordid: types[0].id }]);
    const record = await models.Type.find(type.id);
    const record_lean = await models.Type.find(type.id).lean();
    models.Type.query_record_id_as_string = false;
    expect(type.id).toBeType('string');
    expect(type.recordid).toEqual(String(types[0].id));
    expect(type_bulk[0].id).toBeType('string');
    expect(type_bulk[0].recordid).toEqual(String(types[0].id));
    expect(record.recordid).toEqual(String(types[0].id));
    expect(record_lean.recordid).toEqual(String(types[0].id));
  });

  it('array of recordid', async () => {
    const types = await models.Type.createBulk([{ int_c: 1 }, { int_c: 2 }, { int_c: 3 }]);
    const type_ids = [types[0].id, null, types[1].id, types[2].id, null];
    const type = await models.Type.create({ recordid_array: type_ids });
    const record = await models.Type.find(type.id);
    const record_lean = await models.Type.find(type.id).lean();
    expect(type.recordid_array).toEqual(type_ids);
    expect(record.recordid_array).toEqual(type_ids);
    expect(record_lean.recordid_array).toEqual(type_ids);
  });

  it('array of recordid: query as string', async () => {
    const types = await models.Type.createBulk([{ int_c: 1 }, { int_c: 2 }, { int_c: 3 }]);
    const type_ids = [types[0].id, null, types[1].id, types[2].id, null];
    models.Type.query_record_id_as_string = true;
    const type = await models.Type.create({ recordid_array: type_ids });
    const type_bulk = await models.Type.createBulk([{ recordid_array: type_ids }]);
    const record = await models.Type.find(type.id);
    const record_lean = await models.Type.find(type.id).lean();
    models.Type.query_record_id_as_string = false;
    expect(type.id).toBeType('string');
    expect(type.recordid_array).toEqual(type_ids.map((id) => (id ? String(id) : null)));
    expect(type_bulk[0].id).toBeType('string');
    expect(type_bulk[0].recordid_array).toEqual(type_ids.map((id) => (id ? String(id) : null)));
    expect(record.recordid_array).toEqual(type_ids.map((id) => (id ? String(id) : null)));
    expect(record_lean.recordid_array).toEqual(type_ids.map((id) => (id ? String(id) : null)));
  });

  it('blob', async () => {
    let type = await models.Type.create({ blob: Buffer.from([1, 2, 3, 4]) });
    expect(type.blob).toEqual(Buffer.from([1, 2, 3, 4]));
    type = await models.Type.find(type.id);
    expect(type.blob).toEqual(Buffer.from([1, 2, 3, 4]));
  });
}
