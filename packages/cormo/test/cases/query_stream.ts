import { expect } from 'chai';
import * as cormo from '../..';

import { UserRef, UserRefVO } from './query';

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
  connection: cormo.Connection | null;
}) {
  it('simple', async () => {
    await _createUsers(models.User);
    let count = 0;
    await new Promise<void>((resolve, reject) => {
      models.User.where({ age: 27 })
        .stream()
        .on('data', (user: UserRef) => {
          count++;
          expect(user).to.be.an.instanceof(models.User);
          expect(user).to.have.keys('id', 'name', 'age');
          expect(user.age).to.eql(27);
        }).on('end', () => {
          expect(count).to.eql(2);
          resolve();
        }).on('error', (error) => {
          reject(error);
        });
    });
  });

  it('lean option', async () => {
    await _createUsers(models.User);
    let count = 0;
    await new Promise<void>((resolve, reject) => {
      models.User.where({ age: 27 }).lean()
        .stream()
        .on('data', (user: UserRefVO) => {
          count++;
          expect(user).to.not.be.an.instanceof(models.User);
          expect(user).to.have.keys('id', 'name', 'age');
          expect(user.age).to.eql(27);
        }).on('end', () => {
          expect(count).to.eql(2);
          resolve();
        }).on('error', (error) => {
          reject(error);
        });
    });
  });
}
