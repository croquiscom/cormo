import { expect, it } from 'vitest';
import * as cormo from '../../src/index.js';

export class Order extends cormo.BaseModel {
  public customer!: string;
  public date?: Date;
  public price?: number;
}

export default function (models: { Order: typeof Order; connection: cormo.Connection | null }) {
  it('sum all', async () => {
    const records = await models.Order.group(null, {
      count: { $sum: 1 },
      total: { $sum: '$price' },
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({ count: 9, total: 155 });
  });

  it('sum some', async () => {
    const records = await models.Order.where({ price: { $lt: 10 } }).group(null, {
      count: { $sum: 1 },
      total: { $sum: '$price' },
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({ count: 2, total: 9 });
  });

  it('sum by group', async () => {
    const records = await models.Order.group('customer', {
      count: { $sum: 1 },
      total: { $sum: '$price' },
    });
    expect(records).toHaveLength(3);
    records.sort((a, b) => (a.customer < b.customer ? -1 : 1));
    expect(records[0]).toEqual({ customer: 'Bill Smith', count: 2, total: 76 });
    expect(records[1]).toEqual({ customer: 'Daniel Smith', count: 3, total: 30 });
    expect(records[2]).toEqual({ customer: 'John Doe', count: 4, total: 49 });
  });

  it('order on group column', async () => {
    const records = await models.Order.group('customer', {
      count: { $sum: 1 },
      total: { $sum: '$price' },
    }).order('customer');
    expect(records).toHaveLength(3);
    expect(records[0]).toEqual({ customer: 'Bill Smith', count: 2, total: 76 });
    expect(records[1]).toEqual({ customer: 'Daniel Smith', count: 3, total: 30 });
    expect(records[2]).toEqual({ customer: 'John Doe', count: 4, total: 49 });
  });

  it('order on aggregated column', async () => {
    const records = await models.Order.group('customer', {
      count: { $sum: 1 },
      total: { $sum: '$price' },
    }).order('total');
    expect(records).toHaveLength(3);
    expect(records[0]).toEqual({ customer: 'Daniel Smith', count: 3, total: 30 });
    expect(records[1]).toEqual({ customer: 'John Doe', count: 4, total: 49 });
    expect(records[2]).toEqual({ customer: 'Bill Smith', count: 2, total: 76 });
  });

  it('condition on group column', async () => {
    const records = await models.Order.where({ customer: { $contains: 'smi' } }).group('customer', {
      count: { $sum: 1 },
      total: { $sum: '$price' },
    });
    expect(records).toHaveLength(2);
    records.sort((a, b) => (a.customer < b.customer ? -1 : 1));
    expect(records[0]).toEqual({ customer: 'Bill Smith', count: 2, total: 76 });
    expect(records[1]).toEqual({ customer: 'Daniel Smith', count: 3, total: 30 });
  });

  it('condition on aggregated column', async () => {
    const records = await models.Order.group('customer', {
      count: { $sum: 1 },
      total: { $sum: '$price' },
    }).where({ count: { $gte: 3 } });
    expect(records).toHaveLength(2);
    records.sort((a, b) => (a.customer < b.customer ? -1 : 1));
    expect(records[0]).toEqual({ customer: 'Daniel Smith', count: 3, total: 30 });
    expect(records[1]).toEqual({ customer: 'John Doe', count: 4, total: 49 });
  });

  it('group by multiple columns', async () => {
    const records = await models.Order.group('customer date', {
      count: { $sum: 1 },
      total: { $sum: '$price' },
    }).order('customer date');
    expect(records).toHaveLength(6);
    expect(records[0]).toEqual({ customer: 'Bill Smith', date: new Date('2012/02/03'), count: 2, total: 76 });
    expect(records[1]).toEqual({ customer: 'Daniel Smith', date: new Date('2012/01/19'), count: 1, total: 6 });
    expect(records[2]).toEqual({ customer: 'Daniel Smith', date: new Date('2012/04/23'), count: 2, total: 24 });
    expect(records[3]).toEqual({ customer: 'John Doe', date: new Date('2012/01/01'), count: 2, total: 31 });
    expect(records[4]).toEqual({ customer: 'John Doe', date: new Date('2012/09/23'), count: 1, total: 3 });
    expect(records[5]).toEqual({ customer: 'John Doe', date: new Date('2012/12/07'), count: 1, total: 15 });
  });

  it('limit for group', async () => {
    const records = await models.Order.group('customer date', {
      count: { $sum: 1 },
      total: { $sum: '$price' },
    })
      .order('customer date')
      .limit(2);
    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({ customer: 'Bill Smith', date: new Date('2012/02/03'), count: 2, total: 76 });
    expect(records[1]).toEqual({ customer: 'Daniel Smith', date: new Date('2012/01/19'), count: 1, total: 6 });
  });

  it('group by string array', async () => {
    const records = await models.Order.group(['customer', 'date'], {
      count: { $sum: 1 },
      total: { $sum: '$price' },
    }).order('customer date');
    expect(records).toHaveLength(6);
    expect(records[0]).toEqual({ customer: 'Bill Smith', date: new Date('2012/02/03'), count: 2, total: 76 });
    expect(records[1]).toEqual({ customer: 'Daniel Smith', date: new Date('2012/01/19'), count: 1, total: 6 });
    expect(records[2]).toEqual({ customer: 'Daniel Smith', date: new Date('2012/04/23'), count: 2, total: 24 });
    expect(records[3]).toEqual({ customer: 'John Doe', date: new Date('2012/01/01'), count: 2, total: 31 });
    expect(records[4]).toEqual({ customer: 'John Doe', date: new Date('2012/09/23'), count: 1, total: 3 });
    expect(records[5]).toEqual({ customer: 'John Doe', date: new Date('2012/12/07'), count: 1, total: 15 });
  });

  it('min/max of all', async () => {
    const records = await models.Order.group(null, {
      max_price: { $max: '$price' },
      min_price: { $min: '$price' },
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({ min_price: 3, max_price: 60 });
  });

  it('min/max by group', async () => {
    const records = await models.Order.group('customer', {
      max_price: { $max: '$price' },
      min_price: { $min: '$price' },
    });
    expect(records).toHaveLength(3);
    records.sort((a, b) => (a.customer < b.customer ? -1 : 1));
    expect(records[0]).toEqual({ customer: 'Bill Smith', min_price: 16, max_price: 60 });
    expect(records[1]).toEqual({ customer: 'Daniel Smith', min_price: 6, max_price: 13 });
    expect(records[2]).toEqual({ customer: 'John Doe', min_price: 3, max_price: 20 });
  });

  it('explain', async () => {
    const result = await models.Order.group(null, {
      count: { $sum: 1 },
      total: { $sum: '$price' },
    }).explain();
    expect(result).not.toEqual([{ count: 9, total: 155 }]);
  });

  it('count of group', async () => {
    const count = await models.Order.group('customer').count();
    expect(count).toEqual(3);
  });

  it('count of group with condition on group column', async () => {
    const count = await models.Order.where({
      customer: { $contains: 'smi' },
    })
      .group('customer')
      .count();
    expect(count).toEqual(2);
  });

  it('count of group with condition on aggregated column', async () => {
    const count = await models.Order.group('customer', {
      count: { $sum: 1 },
    })
      .where({ count: { $gte: 3 } })
      .count();
    expect(count).toEqual(2);
  });

  it('avg', async () => {
    const records = await models.Order.group('customer', {
      average_price: { $avg: '$price' },
    });
    expect(records).toHaveLength(3);
    records.sort((a, b) => (a.customer < b.customer ? -1 : 1));
    expect(records[0]).toEqual({ customer: 'Bill Smith', average_price: 38 });
    expect(records[1]).toEqual({ customer: 'Daniel Smith', average_price: 10 });
    expect(records[2]).toEqual({ customer: 'John Doe', average_price: 12.25 });
  });

  it('any', async () => {
    const records: Array<{ customer: string; count: number; date: any }> = await models.Order.group('customer', {
      count: { $sum: 1 },
      date: { $any: '$date' },
    });
    expect(records).toHaveLength(3);
    records.sort((a, b) => (a.customer < b.customer ? -1 : 1));
    records.forEach((r) => (r.date = new Date(r.date)));
    expect(records[0]).toEqual({ customer: 'Bill Smith', count: 2, date: new Date('2012/02/03') });
    expect(records[1]).toEqual({ customer: 'Daniel Smith', count: 3, date: new Date('2012/01/19') });
    expect(records[2]).toEqual({ customer: 'John Doe', count: 4, date: new Date('2012/01/01') });
  });
}
