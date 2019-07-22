// tslint:disable:max-classes-per-file max-line-length

import { expect } from 'chai';
import * as cormo from 'cormo';
import { graphql, GraphQLSchema, printSchema } from 'graphql';
import sinon from 'sinon';
import { Column, createDefaultCrudSchema, Model } from '../..';
import _g = require('../common');

class UserRef extends cormo.BaseModel {
  public name!: string;
  public age?: number | null;
}

describe('createDefaultCrudSchema (timestamp)', () => {
  let connection: cormo.Connection;
  // tslint:disable-next-line:variable-name
  let UserModel: typeof UserRef;
  let schema: GraphQLSchema;
  let sandbox: sinon.SinonSandbox;

  before(() => {
    connection = new cormo.Connection('mysql', _g.db_configs.mysql);
    @Model({ connection, description: 'A user model' })
    class User extends cormo.BaseModel {
      @Column({ type: String, required: true, description: 'name of user' })
      public name!: string;

      @Column({ type: cormo.types.Integer, description: 'age of user' })
      public age?: number;

      @Column({ type: cormo.types.Date, required: true, description: 'date created' })
      public date_created!: Date;

      @Column({ type: cormo.types.Date, required: true, description: 'date updated' })
      public date_updated!: Date;
    }

    UserModel = User;

    schema = createDefaultCrudSchema(User, {
      created_at_column: 'date_created',
      id_description: 'primary key',
      item_list_description: 'A list of users',
      list_type_description: 'A list of users and metadata',
      updated_at_column: 'date_updated',
    });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(async () => {
    sandbox.restore();
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

"""Serve Date object as timestamp"""
scalar CrTimestamp

input DeleteUserInput {
  """primary key"""
  id: ID!
}

type Mutation {
  createUser(input: CreateUserInput): User!
  updateUser(input: UpdateUserInput): User!
  deleteUser(input: DeleteUserInput): Boolean!
}

type Query {
  """Single query for User"""
  user(id: ID): User

  """List query for User"""
  user_list(id_list: [ID!], name: String, name_istartswith: String, name_icontains: String, age: Int, age_gte: Int, age_gt: Int, age_lte: Int, age_lt: Int): UserList!
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

  """date created"""
  date_created: CrTimestamp!

  """date updated"""
  date_updated: CrTimestamp!
}

"""A list of users and metadata"""
type UserList {
  """A list of users"""
  item_list: [User!]!
}
`);
  });

  describe('create', () => {
    it('create one', async () => {
      const now = new Date(2019, 6, 21, 5);
      sandbox.useFakeTimers(now);
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
        { id: Number(id), name: 'Test', age: 15, date_created: now, date_updated: now },
      ]);
    });
  });

  describe('update', () => {
    it('update one', async () => {
      const now = new Date(2019, 6, 21, 5);
      sandbox.useFakeTimers(now);
      const id_to_record_map = await connection.manipulate([
        {
          create_user: {
            age: 15, date_created: new Date(2019, 5, 13), date_updated: new Date(2019, 5, 15),
            id: 'user', name: 'Test',
          },
        },
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
        { id, name: 'Sample', age: 30, date_created: new Date(2019, 5, 13), date_updated: now },
      ]);
    });
  });
});
