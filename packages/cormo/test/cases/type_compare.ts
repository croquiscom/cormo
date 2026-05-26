import { expect, it } from 'vitest';
import * as cormo from '../../src/index.js';

import { Type } from './type.js';

export default function (models: { Type: typeof Type; connection: cormo.Connection | null }) {
  it('compare number', async () => {
    const data = [{ number: 10 }, { number: 14.6 }, { number: -8.3 }, { number: 28.9 }];
    await models.Type.createBulk(data);
    let records = await models.Type.where({ number: 14.6 });
    expect(records).toHaveLength(1);
    expect(records[0].number).toBe(14.6);
    records = await models.Type.where({ number: { $lt: 12 } });
    expect(records).toHaveLength(2);
    records.sort((a, b) => (a.number! < b.number! ? -1 : 1));
    expect(records[0].number).toBe(-8.3);
    expect(records[1].number).toBe(10);
  });

  it('compare integer', async () => {
    const data = [{ int_c: 10 }, { int_c: 15 }, { int_c: -8 }, { int_c: 28 }];
    await models.Type.createBulk(data);
    let records = await models.Type.where({ int_c: 15 });
    expect(records).toHaveLength(1);
    expect(records[0].int_c).toBe(15);
    records = await models.Type.where({ int_c: { $lt: 12 } });
    expect(records).toHaveLength(2);
    records.sort((a, b) => (a.int_c! < b.int_c! ? -1 : 1));
    expect(records[0].int_c).toBe(-8);
    expect(records[1].int_c).toBe(10);
  });

  it('compare biginteger', async () => {
    const LARGE_INT = Math.pow(2, 40);
    const data = [
      { bigint_c: LARGE_INT + 10 },
      { bigint_c: LARGE_INT + 15 },
      { bigint_c: LARGE_INT - 8 },
      { bigint_c: LARGE_INT + 28 },
    ];
    await models.Type.createBulk(data);
    let records = await models.Type.where({ bigint_c: LARGE_INT + 15 });
    expect(records).toHaveLength(1);
    expect(records[0].bigint_c).toBe(LARGE_INT + 15);
    records = await models.Type.where({ bigint_c: { $lt: LARGE_INT + 12 } });
    expect(records).toHaveLength(2);
    records.sort((a, b) => (a.bigint_c! < b.bigint_c! ? -1 : 1));
    expect(records[0].bigint_c).toBe(LARGE_INT - 8);
    expect(records[1].bigint_c).toBe(LARGE_INT + 10);
  });

  it('compare date', async () => {
    const data: any = [
      { date: '2012/10/12 21:32:54' },
      { date: '2012/10/13 21:32:54' },
      { date: '2012/10/14 21:32:54' },
      { date: '2012/10/15 21:32:54' },
    ];
    await models.Type.createBulk(data);
    let records = await models.Type.where({ date: new Date('2012/10/13 21:32:54') });
    expect(records).toHaveLength(1);
    expect(records[0].date).toEqual(new Date('2012/10/13 21:32:54'));
    records = await models.Type.where({ date: '2012/10/13 21:32:54' });
    expect(records).toHaveLength(1);
    expect(records[0].date).toEqual(new Date('2012/10/13 21:32:54'));
    records = await models.Type.where({ date: { $lt: new Date('2012/10/14 00:00:00') } });
    expect(records).toHaveLength(2);
    records.sort((a, b) => (a.date!.getTime() < b.date!.getTime() ? -1 : 1));
    expect(records[0].date).toEqual(new Date('2012/10/12 21:32:54'));
    expect(records[1].date).toEqual(new Date('2012/10/13 21:32:54'));
  });

  it('compare boolean', async () => {
    const data = [{ boolean: true }, { boolean: true }, { boolean: false }, { boolean: true }];
    await models.Type.createBulk(data);
    let records = await models.Type.where({ boolean: true });
    expect(records).toHaveLength(3);
    expect(records[0].boolean).toBe(true);
    expect(records[1].boolean).toBe(true);
    expect(records[2].boolean).toBe(true);
    records = await models.Type.where({ boolean: false });
    expect(records).toHaveLength(1);
    expect(records[0].boolean).toBe(false);
  });

  it('compare string', async () => {
    // string comparison is a little different between DBMSs
    const data = [{ string: '1' }, { string: 'a' }, { string: 'A' }, { string: 'K' }];
    await models.Type.createBulk(data);
    let records = await models.Type.where({ string: 'a' });
    records.sort((a, b) => (a.string! < b.string! ? -1 : 1));
    if (records.length === 2) {
      expect(records).toHaveLength(2);
      expect(records[0].string).toBe('A');
      expect(records[1].string).toBe('a');
    } else {
      expect(records).toHaveLength(1);
      expect(records[0].string).toBe('a');
    }
    records = await models.Type.where({ string: { $lt: 'D' } });
    records.sort((a, b) => (a.string! < b.string! ? -1 : 1));
    if (records.length === 3) {
      expect(records).toHaveLength(3);
      expect(records[0].string).toBe('1');
      expect(records[1].string).toBe('A');
      expect(records[2].string).toBe('a');
    } else {
      expect(records).toHaveLength(2);
      expect(records[0].string).toBe('1');
      expect(records[1].string).toBe('A');
    }
  });

  it('compare text', async () => {
    // string comparison is a little different between DBMSs
    const data = [{ text: '1' }, { text: 'a' }, { text: 'A' }, { text: 'K' }];
    await models.Type.createBulk(data);
    let records = await models.Type.where({ text: 'a' });
    records.sort((a, b) => (a.text! < b.text! ? -1 : 1));
    if (records.length === 2) {
      expect(records).toHaveLength(2);
      expect(records[0].text).toBe('A');
      expect(records[1].text).toBe('a');
    } else {
      expect(records).toHaveLength(1);
      expect(records[0].text).toBe('a');
    }
    records = await models.Type.where({ text: { $lt: 'D' } });
    records.sort((a, b) => (a.text! < b.text! ? -1 : 1));
    if (records.length === 3) {
      expect(records).toHaveLength(3);
      expect(records[0].text).toBe('1');
      expect(records[1].text).toBe('A');
      expect(records[2].text).toBe('a');
    } else {
      expect(records).toHaveLength(2);
      expect(records[0].text).toBe('1');
      expect(records[1].text).toBe('A');
    }
  });
}
