import { expect } from 'chai';
import * as cormo from '../..';

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
    expect(user).to.have.property('created_at');
    expect(user).to.have.property('updated_at');
    expect(user.created_at).to.equal(user.updated_at);
    expect(user.created_at!.getTime()).to.be.closeTo(now, 10);
  });

  it('updated_at', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const created_at = user.created_at;
    await new Promise<void>((resolve, reject) => {
      return setTimeout(function () {
        return resolve();
      }, 50);
    });
    const now = Date.now();
    user.age = 30;
    await user.save();
    // created_at remains unchanged
    expect(user.created_at!.getTime()).to.equal(created_at!.getTime());
    // updated_at is changed to the current date
    expect(user.updated_at!.getTime()).to.be.closeTo(now, 10);
  });
}
