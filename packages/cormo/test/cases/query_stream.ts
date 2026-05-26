import { expect, it } from 'vitest';
import * as cormo from '../../src/index.js';

import { UserRef, UserRefVO } from './query.js';

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

export default function (models: { User: typeof UserRef; connection: cormo.Connection | null }) {
  it('simple', async () => {
    await _createUsers(models.User);
    let count = 0;
    await new Promise<void>((resolve, reject) => {
      models.User.where({ age: 27 })
        .stream()
        .on('data', (user: UserRef) => {
          count++;
          expect(user).toBeInstanceOf(models.User);
          expect(user).toHaveKeys('id', 'name', 'age');
          expect(user.age).toEqual(27);
        })
        .on('end', () => {
          expect(count).toEqual(2);
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  });

  it('lean option', async () => {
    await _createUsers(models.User);
    let count = 0;
    await new Promise<void>((resolve, reject) => {
      models.User.where({ age: 27 })
        .lean()
        .stream()
        .on('data', (user: UserRefVO) => {
          count++;
          expect(user).not.toBeInstanceOf(models.User);
          expect(user).toHaveKeys('id', 'name', 'age');
          expect(user.age).toEqual(27);
        })
        .on('end', () => {
          expect(count).toEqual(2);
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  });
}
