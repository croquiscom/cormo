// tslint:disable:max-classes-per-file

import { expect } from 'chai';
import * as cormo from 'cormo';
import { graphql, GraphQLSchema, printSchema } from 'graphql';
import { Column, createDefaultCrudSchema, Model } from '..';
import _g = require('./support/common');

class UserRef extends cormo.BaseModel {
  public name!: string;
  public age?: number | null;
}

describe('createDefaultCrudSchema', () => {
  let connection: cormo.Connection;
  // tslint:disable-next-line:variable-name
  let UserModel: typeof UserRef;
  let schema: GraphQLSchema;

  before(() => {
    connection = new cormo.Connection('mysql', _g.db_configs.mysql);
    @Model({ connection, description: 'A user model' })
    class User extends cormo.BaseModel {
      @Column({ type: String, required: true, description: 'name of user' })
      public name!: string;

      @Column({ type: cormo.types.Integer, description: 'age of user' })
      public age?: number;
    }

    UserModel = User;

    schema = createDefaultCrudSchema(User, {
      id_description: 'primary key',
      item_list_description: 'A list of users',
      list_type_description: 'A list of users and metadata',
    });
  });

  afterEach(async () => {
    await UserModel.deleteAll();
  });

  after(async () => {
    await UserModel.drop();
    await connection.close();
  });

  it('schema', () => {
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

  describe('single query', () => {
    it('no argument returns null', async () => {
      const id_to_record_map = await connection.manipulate([
        { create_user: { id: 'user', name: 'Test', age: 15 } },
      ]);
      const query = '{ user { id } }';
      const result = await graphql(schema, query);
      expect(result).to.eql({
        data: {
          user: null,
        },
      });
    });

    it('argument id is given', async () => {
      const id_to_record_map = await connection.manipulate([
        { create_user: { id: 'user', name: 'Test', age: 15 } },
      ]);
      const query = 'query($id: ID) { user(id: $id) { id } }';
      const variables = { id: String(id_to_record_map.user.id) };
      const result = await graphql(schema, query, null, null, variables);
      expect(result).to.eql({
        data: {
          user: {
            id: String(id_to_record_map.user.id),
          },
        },
      });
    });

    it('id is not found', async () => {
      const query = 'query($id: ID) { user(id: $id) { id } }';
      const variables = { id: '1' };
      const result = await graphql(schema, query, null, null, variables);
      expect(result).to.eql({
        data: {
          user: null,
        },
      });
    });

    it('get fields', async () => {
      const id_to_record_map = await connection.manipulate([
        { create_user: { id: 'user', name: 'Test', age: 15 } },
      ]);
      const query = 'query($id: ID) { user(id: $id) { id name age } }';
      const variables = { id: String(id_to_record_map.user.id) };
      const result = await graphql(schema, query, null, null, variables);
      expect(result).to.eql({
        data: {
          user: {
            age: 15,
            id: String(id_to_record_map.user.id),
            name: 'Test',
          },
        },
      });
    });
  });
});
