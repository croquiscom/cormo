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
    expect(printSchema(schema)).to.eql(`input CreateUserInput {
  """name of user"""
  name: String!

  """age of user"""
  age: Int
}

type Mutation {
  createUser(input: CreateUserInput): User
  updateUser(input: UpdateUserInput): User
}

type Query {
  """Single query for User"""
  user(id: ID): User

  """List query for User"""
  user_list(id_list: [ID!]): UserList!
}

input UpdateUserInput {
  """primary key"""
  id: ID!

  """name of user"""
  name: String!

  """age of user"""
  age: Int
}

"""A user model"""
type User {
  """primary key"""
  id: ID!

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
          user: { id: String(id_to_record_map.user.id), name: 'Test', age: 15 },
        },
      });
    });
  });

  describe('list query', () => {
    it('no argument returns all', async () => {
      const id_to_record_map = await connection.manipulate([
        { create_user: { id: 'user1', name: 'Test', age: 15 } },
        { create_user: { id: 'user2', name: 'Sample', age: 30 } },
        { create_user: { id: 'user3', name: 'Doe', age: 18 } },
      ]);
      const query = '{ user_list { item_list { id } } }';
      const result = await graphql(schema, query);
      expect(result).to.eql({
        data: {
          user_list: {
            item_list: [
              { id: String(id_to_record_map.user1.id) },
              { id: String(id_to_record_map.user2.id) },
              { id: String(id_to_record_map.user3.id) },
            ],
          },
        },
      });
    });

    it('argument id_list is given', async () => {
      const id_to_record_map = await connection.manipulate([
        { create_user: { id: 'user1', name: 'Test', age: 15 } },
        { create_user: { id: 'user2', name: 'Sample', age: 30 } },
        { create_user: { id: 'user3', name: 'Doe', age: 18 } },
      ]);
      const query = 'query($id_list: [ID!]) { user_list(id_list: $id_list) { item_list { id } } }';
      const variables = {
        id_list: [String(id_to_record_map.user1.id), String(id_to_record_map.user3.id)],
      };
      const result = await graphql(schema, query, null, null, variables);
      expect(result).to.eql({
        data: {
          user_list: {
            item_list: [
              { id: String(id_to_record_map.user1.id) },
              { id: String(id_to_record_map.user3.id) },
            ],
          },
        },
      });
    });

    it('id is not found', async () => {
      const id_to_record_map = await connection.manipulate([
        { create_user: { id: 'user1', name: 'Test', age: 15 } },
        { create_user: { id: 'user2', name: 'Sample', age: 30 } },
        { create_user: { id: 'user3', name: 'Doe', age: 18 } },
      ]);
      const query = 'query($id_list: [ID!]) { user_list(id_list: $id_list) { item_list { id } } }';
      const variables = {
        id_list: [String(id_to_record_map.user1.id), String(id_to_record_map.user3.id + 100)],
      };
      const result = await graphql(schema, query, null, null, variables);
      expect(result).to.eql({
        data: {
          user_list: {
            item_list: [
              { id: String(id_to_record_map.user1.id) },
            ],
          },
        },
      });
    });

    it('get fields', async () => {
      const id_to_record_map = await connection.manipulate([
        { create_user: { id: 'user1', name: 'Test', age: 15 } },
        { create_user: { id: 'user2', name: 'Sample', age: 30 } },
        { create_user: { id: 'user3', name: 'Doe', age: 18 } },
      ]);
      const query = 'query($id_list: [ID!]) { user_list(id_list: $id_list) { item_list { id name age } } }';
      const variables = {
        id_list: [String(id_to_record_map.user1.id), String(id_to_record_map.user3.id)],
      };
      const result = await graphql(schema, query, null, null, variables);
      expect(result).to.eql({
        data: {
          user_list: {
            item_list: [
              { id: String(id_to_record_map.user1.id), name: 'Test', age: 15 },
              { id: String(id_to_record_map.user3.id), name: 'Doe', age: 18 },
            ],
          },
        },
      });
    });
  });

  describe('create', () => {
    it('create one', async () => {
      const query = 'mutation($input: CreateUserInput!) { createUser(input: $input) { id name age } }';
      const variables = { input: { name: 'Test', age: 15 } };
      const result = await graphql(schema, query, null, null, variables);
      const id = result.data!.createUser.id;
      expect(result).to.eql({
        data: {
          createUser: { id, name: 'Test', age: 15 },
        },
      });
      expect(await UserModel.where()).to.eql([
        { id: Number(id), name: 'Test', age: 15 },
      ]);
    });

    it('optional field', async () => {
      const query = 'mutation($input: CreateUserInput!) { createUser(input: $input) { id name age } }';
      const variables = { input: { name: 'Test', age: null } };
      const result = await graphql(schema, query, null, null, variables);
      const id = result.data!.createUser.id;
      expect(result).to.eql({
        data: {
          createUser: { id, name: 'Test', age: null },
        },
      });
      expect(await UserModel.where()).to.eql([
        { id: Number(id), name: 'Test', age: null },
      ]);
    });
  });

  describe('update', () => {
    it('update one', async () => {
      const id_to_record_map = await connection.manipulate([
        { create_user: { id: 'user', name: 'Test', age: 15 } },
      ]);
      const id = id_to_record_map.user.id;
      const query = 'mutation($input: UpdateUserInput!) { updateUser(input: $input) { id name age } }';
      const variables = { input: { id: String(id), name: 'Sample', age: 30 } };
      const result = await graphql(schema, query, null, null, variables);
      expect(result).to.eql({
        data: {
          updateUser: { id: String(id), name: 'Sample', age: 30 },
        },
      });
      expect(await UserModel.where()).to.eql([
        { id, name: 'Sample', age: 30 },
      ]);
    });

    it('omit optional field', async () => {
      const id_to_record_map = await connection.manipulate([
        { create_user: { id: 'user', name: 'Test', age: 15 } },
      ]);
      const id = id_to_record_map.user.id;
      const query = 'mutation($input: UpdateUserInput!) { updateUser(input: $input) { id name age } }';
      const variables = { input: { id: String(id), name: 'Sample' } };
      const result = await graphql(schema, query, null, null, variables);
      expect(result).to.eql({
        data: {
          updateUser: { id: String(id), name: 'Sample', age: 15 },
        },
      });
      expect(await UserModel.where()).to.eql([
        { id, name: 'Sample', age: 15 },
      ]);
    });

    it('record not found', async () => {
      const query = 'mutation($input: UpdateUserInput!) { updateUser(input: $input) { id name age } }';
      const variables = { input: { id: '1', name: 'Sample' } };
      const result = await graphql(schema, query, null, null, variables);
      expect(result).to.eql({
        data: {
          updateUser: null,
        },
        errors: [{
          locations: [{ column: 38, line: 1 }],
          message: 'not found',
          path: ['updateUser'],
        }],
      });
    });
  });
});
