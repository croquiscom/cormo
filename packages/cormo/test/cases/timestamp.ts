import { expect, it } from 'vitest';
import * as cormo from '../../src/index.js';

export class UserRef extends cormo.BaseModel {
  public name?: string;
  public age?: number;

  public created_at?: Date;
  public updated_at?: Date;
}

export default function (models: { User: typeof UserRef; connection: cormo.Connection | null }) {
  it('created_at', async () => {
    const now = Date.now();
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    expect(user).toHaveProperty('created_at');
    expect(user).toHaveProperty('updated_at');
    expect(user.created_at).toBe(user.updated_at);
    expect(Math.abs(user.created_at!.getTime() - now)).toBeLessThanOrEqual(10);
  });

  it('updated_at', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const created_at = user.created_at;
    await new Promise<void>((resolve) => {
      return setTimeout(function () {
        return resolve();
      }, 50);
    });
    const now = Date.now();
    user.age = 30;
    await user.save();
    // created_at remains unchanged
    expect(user.created_at!.getTime()).toBe(created_at!.getTime());
    // updated_at is changed to the current date
    expect(Math.abs(user.updated_at!.getTime() - now)).toBeLessThanOrEqual(10);
  });
}
