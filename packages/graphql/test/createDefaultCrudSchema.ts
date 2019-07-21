import { expect } from 'chai';
import * as cormo from 'cormo';
import { printSchema } from 'graphql';
import { Column, createDefaultCrudSchema, Model } from '..';
import _g = require('./support/common');

describe('createDefaultCrudSchema', () => {
  it('schema', () => {
    const connection = new cormo.Connection('mysql', _g.db_configs.mysql);
    @Model({ connection, description: 'A user model' })
    class User extends cormo.BaseModel {
      @Column({ type: String, required: true, description: 'name of user' })
      public name?: string;

      @Column({ type: cormo.types.Integer, description: 'age of user' })
      public age?: number;
    }

    const schema = createDefaultCrudSchema(User, {
      id_description: 'primary key',
      item_list_description: 'A list of users',
      list_type_description: 'A list of users and metadata',
    });
    expect(printSchema(schema)).to.eql(`type Query {
  """Single query for User"""
  user(id: ID): User

  """List query for User"""
  user_list(id_list: [ID!]): UserList!
}

"""A user model"""
type User {
  """primary key"""
  id: ID

  """name of user"""
  name: String!

  """age of user"""
  age: Int
}

"""A list of users and metadata"""
type UserList {
  """A list of users"""
  item_list: [User!]!
}
`);
  });
});
