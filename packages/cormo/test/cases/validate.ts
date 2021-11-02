import { expect } from 'chai';
import * as cormo from '../..';

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
      expect(error).to.exist;
      expect(error.message).to.equal('too young');
    }
  });

  it('invalid email', async () => {
    try {
      await models.User.create({ name: 'John Doe', age: 27, email: 'invalid' });
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).to.exist;
      expect(error.message).to.equal('invalid email');
    }
  });

  it('invalid both', async () => {
    try {
      await models.User.create({ name: 'John Doe', age: 10, email: 'invalid' });
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).to.exist;
      if (error.message !== 'invalid email,too young') {
        expect(error.message).to.equal('too young,invalid email');
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
