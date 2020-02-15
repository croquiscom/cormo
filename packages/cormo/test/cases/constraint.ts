// tslint:disable:max-classes-per-file variable-name no-unused-expression

import { expect } from 'chai';
import * as cormo from '../..';

export class UserRef extends cormo.BaseModel {
  public name!: string;
  public age!: number;
  public email!: string;
  public facebook_id?: string | null;
}

export class PostRef extends cormo.BaseModel {
  public title?: string | null;
  public body?: string | null;

  public user?: () => UserRef;

  public user_id!: number;
}

async function _createUsers(User: typeof UserRef, data?: cormo.ModelValueObject<UserRef>[]) {
  if (!data) {
    data = [
      { name: 'John Doe', age: 27, email: 'john.doe@example.com', facebook_id: '1' },
      { name: 'Bill Smith', age: 45, email: 'bill@foo.org', facebook_id: '2' },
      { name: 'Alice Jackson', age: 27, email: 'ceo@wonderful.com', facebook_id: '3' },
      { name: 'Gina Baker', age: 32, email: 'gina@example.com', facebook_id: '4' },
    ];
  }
  return await User.createBulk(data);
}

export default function(models: {
  Post: typeof PostRef,
  User: typeof UserRef,
}) {
  it('unique', async () => {
    const users = await _createUsers(models.User);
    let user;
    try {
      user = await models.User.create({ name: 'Bill Simpson', age: 38, email: 'bill@foo.org' });
      throw new Error('must throw an error.');
    } catch (error) {
      // 'duplicated email' or 'duplicated'
      expect(error.message).to.match(/^duplicated( email)?$/);
      expect(user).to.not.exist;
    }
  });

  it('check uniqueness on update by Model::save', async () => {
    const users = await _createUsers(models.User);
    users[0].email = 'bill@foo.org';
    try {
      await users[0].save();
      throw new Error('must throw an error.');
    } catch (error) {
      // 'duplicated email' or 'duplicated'
      expect(error.message).to.match(/^duplicated( email)?$/);
    }
  });

  it('check uniqueness on update by Model.update', async () => {
    const users = await _createUsers(models.User);
    try {
      await models.User.find(users[0].id).update({ email: 'bill@foo.org' });
      throw new Error('must throw an error.');
    } catch (error) {
      // 'duplicated email' or 'duplicated'
      expect(error.message).to.match(/^duplicated( email)?$/);
    }
  });

  it('required', async () => {
    try {
      await models.User.create({ age: 10, email: 'test1@example.com' } as any);
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error.message).to.equal("'name' is required");
    }
    try {
      await models.User.create({ name: 'test', email: 'test2@example.com' } as any);
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error.message).to.equal("'age' is required");
    }
    try {
      await models.User.create({ name: 'test', age: 10 } as any);
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error.message).to.equal("'email' is required");
    }
  });

  it('unique but not required', async () => {
    // There can be two null values
    // ( MongoDB can have an index unique but not sparse )
    await models.User.create({ name: 'test', age: 10, email: 'test1@example.com' });
    await models.User.create({ name: 'test', age: 10, email: 'test2@example.com' });
  });

  it('required on update by Model::save', async () => {
    const users = await _createUsers(models.User);
    (users[0] as any).name = null;
    try {
      await users[0].save();
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error.message).to.equal("'name' is required");
    }
  });

  it('required on update by Model.update', async () => {
    const users = await _createUsers(models.User);
    try {
      await models.User.find(users[0].id).update({ name: null });
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error.message).to.equal("'name' is required");
    }
  });

  it('required of belongsTo', async () => {
    const user = await models.User.create({ name: 'Bill Simpson', age: 38, email: 'bill@foo.org' });
    try {
      await models.Post.create({ title: 'first post', body: 'This is the 1st post.' } as any);
      throw new Error('must throw an error.');
    } catch (error) {
      expect(error.message).to.equal("'user_id' is required");
    }
    await models.Post.create({ title: 'first post', body: 'This is the 1st post.', user_id: user.id });
  });
}
