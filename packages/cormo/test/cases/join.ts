import { expect } from 'chai';
import * as cormo from '../..';

export class UserRef extends cormo.BaseModel {
  public name?: string | null;

  public age?: number | null;
}

export class PostRef extends cormo.BaseModel {
  public title?: string | null;

  public body?: string | null;

  public user_id?: number | null;

  public parent_post_id?: number | null;
}

export class ComputerRef extends cormo.BaseModel {
  public brand?: string | null;

  public user_id?: number | null;
}

export default function (models: { Computer: typeof ComputerRef; Post: typeof PostRef; User: typeof UserRef }) {
  it('inner join', async () => {
    const users = await models.User.createBulk([
      { name: 'John Doe', age: 27 },
      { name: 'Bill Smith', age: 45 },
      { name: 'Alice Jackson', age: 27 },
    ]);
    const posts = await models.Post.createBulk([
      { title: 'first post', body: 'This is the 1st post.', user_id: users[0].id },
      { title: 'second post', body: 'This is the 2nd post.', user_id: users[0].id },
      { title: 'third post', body: 'This is the 3rd post.', user_id: users[1].id },
    ]);
    const records = await models.User.query().join(models.Post);
    expect(records).to.have.length(3);
    expect(records[0]).to.be.an.instanceof(models.User);
    expect(records).to.eql([
      { id: users[0].id, name: users[0].name, age: users[0].age },
      { id: users[0].id, name: users[0].name, age: users[0].age },
      { id: users[1].id, name: users[1].name, age: users[1].age },
    ]);
  });

  it('left outer join', async () => {
    const users = await models.User.createBulk([
      { name: 'John Doe', age: 27 },
      { name: 'Bill Smith', age: 45 },
      { name: 'Alice Jackson', age: 27 },
    ]);
    const posts = await models.Post.createBulk([
      { title: 'first post', body: 'This is the 1st post.', user_id: users[0].id },
      { title: 'second post', body: 'This is the 2nd post.', user_id: users[0].id },
      { title: 'third post', body: 'This is the 3rd post.', user_id: users[1].id },
    ]);
    const records = await models.User.query().left_outer_join(models.Post);
    expect(records).to.have.length(4);
    expect(records[0]).to.be.an.instanceof(models.User);
    expect(records).to.eql([
      { id: users[0].id, name: users[0].name, age: users[0].age },
      { id: users[0].id, name: users[0].name, age: users[0].age },
      { id: users[1].id, name: users[1].name, age: users[1].age },
      { id: users[2].id, name: users[2].name, age: users[2].age },
    ]);
  });
}
