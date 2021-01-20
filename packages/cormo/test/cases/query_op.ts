import { expect } from 'chai';
import * as cormo from '../..';

import { UserRef, UserRefVO, LedgerRef, LedgerRefVO } from './query';

function _compareUser(user: UserRef, expected: UserRefVO) {
  expect(user).to.have.keys('id', 'name', 'age');
  expect(user.name).to.equal(expected.name);
  expect(user.age).to.equal(expected.age);
}

async function _createUsers(User: typeof UserRef, data?: UserRefVO[]) {
  if (!data) {
    data = [
      { name: 'John Doe', age: 27 },
      { name: 'Bill Smith', age: 45 },
      { name: 'Alice Jackson', age: 27 },
      { name: 'Gina Baker', age: 32 },
      { name: 'Daniel Smith', age: 8 },
    ];
  }
  data.sort(() => 0.5 - Math.random()); // random sort
  return await User.createBulk(data);
}

export default function(models: {
  User: typeof UserRef;
  Ledger: typeof LedgerRef;
  connection: cormo.Connection | null;
}) {
  it('comparison', async () => {
    await _createUsers(models.User);
    const users = await models.User.where([{ age: { $gt: 30 } }, { age: { $lte: 45 } }]);
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Gina Baker', age: 32 });
  });

  it('contains', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ name: { $contains: 'smi' } });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Daniel Smith', age: 8 });
  });

  it('contains with SQL special character', async () => {
    await models.User.createBulk([
      { name: 'Bill S%_th', age: 45 },
      { name: 'Daniel Smith', age: 8 },
    ]);
    const users = await models.User.where({ name: { $contains: 's%_' } });
    expect(users).to.have.length(1);
    _compareUser(users[0], { name: 'Bill S%_th', age: 45 });
  });

  it('contains multiple', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ name: { $contains: ['baker', 'doe'] } });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Gina Baker', age: 32 });
    _compareUser(users[1], { name: 'John Doe', age: 27 });
  });

  it('startswith', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ name: { $startswith: 'd' } });
    expect(users).to.have.length(1);
    _compareUser(users[0], { name: 'Daniel Smith', age: 8 });
  });

  it('startswith with SQL special character', async () => {
    await models.User.createBulk([
      { name: 'Bill Smith', age: 45 },
      { name: '_ina Baker', age: 32 },
    ]);
    const users = await models.User.where({ name: { $startswith: '_i' } });
    expect(users).to.have.length(1);
    _compareUser(users[0], { name: '_ina Baker', age: 32 });
  });

  it('endswith', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ name: { $endswith: 'h' } });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Daniel Smith', age: 8 });
  });

  it('endswith with SQL special character', async () => {
    await models.User.createBulk([
      { name: 'Bill Smith', age: 45 },
      { name: 'Daniel Smit_', age: 8 },
    ]);
    const users = await models.User.where({ name: { $endswith: 't_' } });
    expect(users).to.have.length(1);
    _compareUser(users[0], { name: 'Daniel Smit_', age: 8 });
  });

  it('$in', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: { $in: [32, 45, 57] } });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Gina Baker', age: 32 });
  });

  it('$in for id', async () => {
    const sources = await _createUsers(models.User);
    sources.sort((a, b) => a.name! < b.name! ? -1 : 1);
    const users = await models.User.where({ id: { $in: [sources[2].id, sources[0].id] } });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
    _compareUser(users[1], { name: 'Daniel Smith', age: 8 });
  });

  it('implicit $in', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: [32, 45, 57] });
    expect(users).to.have.length(2);
    users.sort((a, b) => a.name! < b.name! ? -1 : 1);
    _compareUser(users[0], { name: 'Bill Smith', age: 45 });
    _compareUser(users[1], { name: 'Gina Baker', age: 32 });
  });

  it('$in with an empty array', async () => {
    await _createUsers(models.User);
    const users = await models.User.where({ age: { $in: [] } });
    expect(users).to.have.length(0);
  });

  it('basic regular expression', async () => {
    await _createUsers(models.User);
    try {
      const users = await models.User.where({ name: /smi/ });
      expect(users).to.have.length(2);
      users.sort((a, b) => a.name! < b.name! ? -1 : 1);
      _compareUser(users[0], { name: 'Bill Smith', age: 45 });
      _compareUser(users[1], { name: 'Daniel Smith', age: 8 });
    } catch (error) {
      if (error.message === 'regular expression is not supported') {
        return;
      }
      throw error;
    }
  });

  it('complex regular expression', async () => {
    await _createUsers(models.User);
    try {
      const users = await models.User.where({ name: /l{2}|n$/ });
      expect(users).to.have.length(2);
      users.sort((a, b) => a.name! < b.name! ? -1 : 1);
      _compareUser(users[0], { name: 'Alice Jackson', age: 27 });
      _compareUser(users[1], { name: 'Bill Smith', age: 45 });
    } catch (error) {
      if (error.message === 'regular expression is not supported') {
        return;
      }
      throw error;
    }
  });

  it('column comparison - equal to', async () => {
    await models.Ledger.createBulk([
      { date_ymd: 20210105, debit: 500, credit: 600, balance: 1000 },
      { date_ymd: 20210106, debit: 400, credit: 300, balance: 900 },
      { date_ymd: 20210107, debit: 600, credit: 600, balance: 400 },
      { date_ymd: 20210108, debit: 900, credit: 400, balance: 400 },
      { date_ymd: 20210109, debit: 300, credit: 700, balance: 800 },
    ]);
    const ledgers = await models.Ledger.where({ debit: { $ceq: '$credit' } }).select(['date_ymd']);
    expect(ledgers).to.eql([
      { id: null, date_ymd: 20210107 },
    ]);
  });

  it('column comparison - not equal to', async () => {
    await models.Ledger.createBulk([
      { date_ymd: 20210105, debit: 500, credit: 600, balance: 1000 },
      { date_ymd: 20210106, debit: 400, credit: 300, balance: 900 },
      { date_ymd: 20210107, debit: 600, credit: 600, balance: 400 },
      { date_ymd: 20210108, debit: 900, credit: 400, balance: 400 },
      { date_ymd: 20210109, debit: 300, credit: 700, balance: 800 },
    ]);
    const ledgers = await models.Ledger.where({ debit: { $cne: '$credit' } }).select(['date_ymd']);
    expect(ledgers).to.eql([
      { id: null, date_ymd: 20210105 },
      { id: null, date_ymd: 20210106 },
      { id: null, date_ymd: 20210108 },
      { id: null, date_ymd: 20210109 },
    ]);
  });

  it('column comparison - greater than', async () => {
    await models.Ledger.createBulk([
      { date_ymd: 20210105, debit: 500, credit: 600, balance: 1000 },
      { date_ymd: 20210106, debit: 400, credit: 300, balance: 900 },
      { date_ymd: 20210107, debit: 600, credit: 600, balance: 400 },
      { date_ymd: 20210108, debit: 900, credit: 400, balance: 400 },
      { date_ymd: 20210109, debit: 300, credit: 700, balance: 800 },
    ]);
    const ledgers = await models.Ledger.where({ debit: { $cgt: '$credit' } }).select(['date_ymd']);
    expect(ledgers).to.eql([
      { id: null, date_ymd: 20210106 },
      { id: null, date_ymd: 20210108 },
    ]);
  });

  it('column comparison - greater than or equal to', async () => {
    await models.Ledger.createBulk([
      { date_ymd: 20210105, debit: 500, credit: 600, balance: 1000 },
      { date_ymd: 20210106, debit: 400, credit: 300, balance: 900 },
      { date_ymd: 20210107, debit: 600, credit: 600, balance: 400 },
      { date_ymd: 20210108, debit: 900, credit: 400, balance: 400 },
      { date_ymd: 20210109, debit: 300, credit: 700, balance: 800 },
    ]);
    const ledgers = await models.Ledger.where({ debit: { $cgte: '$credit' } }).select(['date_ymd']);
    expect(ledgers).to.eql([
      { id: null, date_ymd: 20210106 },
      { id: null, date_ymd: 20210107 },
      { id: null, date_ymd: 20210108 },
    ]);
  });

  it('column comparison - less than', async () => {
    await models.Ledger.createBulk([
      { date_ymd: 20210105, debit: 500, credit: 600, balance: 1000 },
      { date_ymd: 20210106, debit: 400, credit: 300, balance: 900 },
      { date_ymd: 20210107, debit: 600, credit: 600, balance: 400 },
      { date_ymd: 20210108, debit: 900, credit: 400, balance: 400 },
      { date_ymd: 20210109, debit: 300, credit: 700, balance: 800 },
    ]);
    const ledgers = await models.Ledger.where({ debit: { $clt: '$credit' } }).select(['date_ymd']);
    expect(ledgers).to.eql([
      { id: null, date_ymd: 20210105 },
      { id: null, date_ymd: 20210109 },
    ]);
  });

  it('column comparison - less than', async () => {
    await models.Ledger.createBulk([
      { date_ymd: 20210105, debit: 500, credit: 600, balance: 1000 },
      { date_ymd: 20210106, debit: 400, credit: 300, balance: 900 },
      { date_ymd: 20210107, debit: 600, credit: 600, balance: 400 },
      { date_ymd: 20210108, debit: 900, credit: 400, balance: 400 },
      { date_ymd: 20210109, debit: 300, credit: 700, balance: 800 },
    ]);
    const ledgers = await models.Ledger.where({ debit: { $clte: '$credit' } }).select(['date_ymd']);
    expect(ledgers).to.eql([
      { id: null, date_ymd: 20210105 },
      { id: null, date_ymd: 20210107 },
      { id: null, date_ymd: 20210109 },
    ]);
  });
}
