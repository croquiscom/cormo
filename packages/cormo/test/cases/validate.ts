import { expect, it } from 'vitest';
import * as cormo from '../../src/index.js';

export class User extends cormo.BaseModel {
  public name?: string;
  public age?: number;
  public email?: string;
}

export default function (models: { User: typeof User; connection: cormo.Connection | null }) {
  it('valid', async () => {
    await models.User.create({ name: 'John Doe', age: 27 });
  });

  it('invalid age', async () => {
    try {
      await models.User.create({ name: 'John Doe', age: 10 });
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).toExist();
      expect(error.message).toBe('too young');
    }
  });

  it('invalid email', async () => {
    try {
      await models.User.create({ name: 'John Doe', age: 27, email: 'invalid' });
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).toExist();
      expect(error.message).toBe('invalid email');
    }
  });

  it('invalid both', async () => {
    try {
      await models.User.create({ name: 'John Doe', age: 10, email: 'invalid' });
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).toExist();
      if (error.message !== 'invalid email,too young') {
        expect(error.message).toBe('too young,invalid email');
      }
    }
  });

  it('validation bug $inc: 0', async () => {
    if (!(models.connection!.adapter as any).support_upsert) {
      return;
    }
    await models.User.where({ name: 'John Doe' }).upsert({ age: { $inc: 0 } });
  });
}
