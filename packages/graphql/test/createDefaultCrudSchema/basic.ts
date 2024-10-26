import { expect } from 'chai';
import * as cormo from 'cormo';
import { graphql, GraphQLSchema, printSchema } from 'graphql';
import { Column, createDefaultCrudSchema, Model } from '../..';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import _g = require('../common');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class UserRef extends cormo.BaseModel {
  public name!: string;
  public age?: number | null;
}

describe('createDefaultCrudSchema (basic)', () => {
  let connection: cormo.Connection;
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
    connection.close();
  });

  it('schema', () => {
    expect(printSchema(schema)).to.eql(`type Query {
  """Single query for User"""
  user(id: ID): User

  """List query for User"""
  user_list(id_list: [ID!], name: String, name_istartswith: String, name_icontains: String, age: Int, age_gte: Int, age_gt: Int, age_lte: Int, age_lt: Int, order: UserOrderType, limit_count: Int, skip_count: Int): UserList!
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

enum UserOrderType {
  ID_ASC
  ID_DESC
  NAME_ASC
  NAME_DESC
  AGE_ASC
  AGE_DESC
}

type Mutation {
  createUser(input: CreateUserInput): User!
  updateUser(input: UpdateUserInput): User!
  deleteUser(input: DeleteUserInput): Boolean!
}

input CreateUserInput {
  """name of user"""
  name: String!

  """age of user"""
  age: Int
}

input UpdateUserInput {
  """primary key"""
  id: ID!

  """name of user"""
  name: String!

  """age of user"""
  age: Int
}

input DeleteUserInput {
  """primary key"""
  id: ID!
}`);
  });

  describe('single query', () => {
    it('no argument returns null', async () => {
      const _id_to_record_map = await connection.manipulate([{ create_user: { id: 'user', name: 'Test', age: 15 } }]);
      const query = '{ user { id } }';
      const result = await graphql({ schema, source: query });
      expect(result).to.eql({
        data: {
          user: null,
        },
      });
    });

    it('argument id is given', async () => {
      const id_to_record_map = await connection.manipulate([{ create_user: { id: 'user', name: 'Test', age: 15 } }]);
      const query = 'query($id: ID) { user(id: $id) { id } }';
      const variables = { id: String(id_to_record_map.user.id) };
      const result = await graphql({ schema, source: query, variableValues: variables });
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
      const result = await graphql({ schema, source: query, variableValues: variables });
      expect(result).to.eql({
        data: {
          user: null,
        },
      });
    });

    it('get fields', async () => {
      const id_to_record_map = await connection.manipulate([{ create_user: { id: 'user', name: 'Test', age: 15 } }]);
      const query = 'query($id: ID) { user(id: $id) { id name age } }';
      const variables = { id: String(id_to_record_map.user.id) };
      const result = await graphql({ schema, source: query, variableValues: variables });
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
      const result = await graphql({ schema, source: query });
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
      const result = await graphql({ schema, source: query, variableValues: variables });
      expect(result).to.eql({
        data: {
          user_list: {
            item_list: [{ id: String(id_to_record_map.user1.id) }, { id: String(id_to_record_map.user3.id) }],
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
      const result = await graphql({ schema, source: query, variableValues: variables });
      expect(result).to.eql({
        data: {
          user_list: {
            item_list: [{ id: String(id_to_record_map.user1.id) }],
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
      const result = await graphql({ schema, source: query, variableValues: variables });
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

    describe('generated arguments', () => {
      it('string match', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Test Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe Test', age: 18 } },
        ]);
        const query = '{ user_list(name: "Test") { item_list { id } } }';
        const result = await graphql({ schema, source: query });
        expect(result).to.eql({
          data: {
            user_list: {
              item_list: [{ id: String(id_to_record_map.user1.id) }],
            },
          },
        });
      });

      it('string istartswith', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'test Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe Test', age: 18 } },
        ]);
        const query = '{ user_list(name_istartswith: "Te") { item_list { id } } }';
        const result = await graphql({ schema, source: query });
        expect(result).to.eql({
          data: {
            user_list: {
              item_list: [{ id: String(id_to_record_map.user1.id) }, { id: String(id_to_record_map.user2.id) }],
            },
          },
        });
      });

      it('string icontains', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe', age: 18 } },
        ]);
        const query = '{ user_list(name_icontains: "s") { item_list { id } } }';
        const result = await graphql({ schema, source: query });
        expect(result).to.eql({
          data: {
            user_list: {
              item_list: [{ id: String(id_to_record_map.user1.id) }, { id: String(id_to_record_map.user2.id) }],
            },
          },
        });
      });

      it('number match', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Test Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe Test', age: 18 } },
        ]);
        const query = '{ user_list(age: 30) { item_list { id } } }';
        const result = await graphql({ schema, source: query });
        expect(result).to.eql({
          data: {
            user_list: {
              item_list: [{ id: String(id_to_record_map.user2.id) }],
            },
          },
        });
      });

      it('number gte', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Test Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe Test', age: 18 } },
        ]);
        const query = '{ user_list(age_gte: 18) { item_list { id } } }';
        const result = await graphql({ schema, source: query });
        expect(result).to.eql({
          data: {
            user_list: {
              item_list: [{ id: String(id_to_record_map.user2.id) }, { id: String(id_to_record_map.user3.id) }],
            },
          },
        });
      });

      it('number gt', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Test Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe Test', age: 18 } },
        ]);
        const query = '{ user_list(age_gt: 15) { item_list { id } } }';
        const result = await graphql({ schema, source: query });
        expect(result).to.eql({
          data: {
            user_list: {
              item_list: [{ id: String(id_to_record_map.user2.id) }, { id: String(id_to_record_map.user3.id) }],
            },
          },
        });
      });

      it('number lte', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Test Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe Test', age: 18 } },
        ]);
        const query = '{ user_list(age_lte: 18) { item_list { id } } }';
        const result = await graphql({ schema, source: query });
        expect(result).to.eql({
          data: {
            user_list: {
              item_list: [{ id: String(id_to_record_map.user1.id) }, { id: String(id_to_record_map.user3.id) }],
            },
          },
        });
      });

      it('number lt', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Test Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe Test', age: 18 } },
        ]);
        const query = '{ user_list(age_lt: 30) { item_list { id } } }';
        const result = await graphql({ schema, source: query });
        expect(result).to.eql({
          data: {
            user_list: {
              item_list: [{ id: String(id_to_record_map.user1.id) }, { id: String(id_to_record_map.user3.id) }],
            },
          },
        });
      });

      it('limit_count', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe', age: 18 } },
        ]);
        const query = '{ user_list(limit_count: 1) { item_list { id } } }';
        const variables = {
          id_list: [String(id_to_record_map.user1.id), String(id_to_record_map.user3.id)],
        };
        const result = await graphql({ schema, source: query, variableValues: variables });
        expect(result).to.eql({
          data: {
            user_list: {
              item_list: [{ id: String(id_to_record_map.user1.id) }],
            },
          },
        });
      });

      it('skip_count', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe', age: 18 } },
        ]);
        const query = '{ user_list(skip_count: 1) { item_list { id } } }';
        const variables = {
          id_list: [String(id_to_record_map.user1.id), String(id_to_record_map.user3.id)],
        };
        const result = await graphql({ schema, source: query, variableValues: variables });
        expect(result).to.eql({
          data: {
            user_list: {
              item_list: [{ id: String(id_to_record_map.user2.id) }, { id: String(id_to_record_map.user3.id) }],
            },
          },
        });
      });
    });

    describe('order', () => {
      it('id ascending', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe', age: 18 } },
        ]);
        const query = '{ user_list(order: ID_ASC) { item_list { id } } }';
        const result = await graphql({ schema, source: query });
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

      it('id descending', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe', age: 18 } },
        ]);
        const query = '{ user_list(order: ID_DESC) { item_list { id } } }';
        const result = await graphql({ schema, source: query });
        expect(result).to.eql({
          data: {
            user_list: {
              item_list: [
                { id: String(id_to_record_map.user3.id) },
                { id: String(id_to_record_map.user2.id) },
                { id: String(id_to_record_map.user1.id) },
              ],
            },
          },
        });
      });

      it('string ascending', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe', age: 18 } },
        ]);
        const query = '{ user_list(order: NAME_ASC) { item_list { id } } }';
        const result = await graphql({ schema, source: query });
        expect(result).to.eql({
          data: {
            user_list: {
              item_list: [
                { id: String(id_to_record_map.user3.id) },
                { id: String(id_to_record_map.user2.id) },
                { id: String(id_to_record_map.user1.id) },
              ],
            },
          },
        });
      });

      it('string descending', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe', age: 18 } },
        ]);
        const query = '{ user_list(order: NAME_DESC) { item_list { id } } }';
        const result = await graphql({ schema, source: query });
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

      it('integer ascending', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe', age: 18 } },
        ]);
        const query = '{ user_list(order: AGE_ASC) { item_list { id } } }';
        const result = await graphql({ schema, source: query });
        expect(result).to.eql({
          data: {
            user_list: {
              item_list: [
                { id: String(id_to_record_map.user1.id) },
                { id: String(id_to_record_map.user3.id) },
                { id: String(id_to_record_map.user2.id) },
              ],
            },
          },
        });
      });

      it('integer descending', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Sample', age: 30 } },
          { create_user: { id: 'user3', name: 'Doe', age: 18 } },
        ]);
        const query = '{ user_list(order: AGE_DESC) { item_list { id } } }';
        const result = await graphql({ schema, source: query });
        expect(result).to.eql({
          data: {
            user_list: {
              item_list: [
                { id: String(id_to_record_map.user2.id) },
                { id: String(id_to_record_map.user3.id) },
                { id: String(id_to_record_map.user1.id) },
              ],
            },
          },
        });
      });
    });
  });

  describe('create', () => {
    it('create one', async () => {
      const query = 'mutation($input: CreateUserInput!) { createUser(input: $input) { id name age } }';
      const variables = { input: { name: 'Test', age: 15 } };
      const result = await graphql({ schema, source: query, variableValues: variables });
      const id = (result.data as any).createUser.id;
      expect(result).to.eql({
        data: {
          createUser: { id, name: 'Test', age: 15 },
        },
      });
      expect(await UserModel.where()).to.eql([{ id: Number(id), name: 'Test', age: 15 }]);
    });

    it('optional field', async () => {
      const query = 'mutation($input: CreateUserInput!) { createUser(input: $input) { id name age } }';
      const variables = { input: { name: 'Test', age: null } };
      const result = await graphql({ schema, source: query, variableValues: variables });
      const id = (result.data as any).createUser.id;
      expect(result).to.eql({
        data: {
          createUser: { id, name: 'Test', age: null },
        },
      });
      expect(await UserModel.where()).to.eql([{ id: Number(id), name: 'Test', age: null }]);
    });
  });

  describe('update', () => {
    it('update one', async () => {
      const id_to_record_map = await connection.manipulate([{ create_user: { id: 'user', name: 'Test', age: 15 } }]);
      const id = id_to_record_map.user.id;
      const query = 'mutation($input: UpdateUserInput!) { updateUser(input: $input) { id name age } }';
      const variables = { input: { id: String(id), name: 'Sample', age: 30 } };
      const result = await graphql({ schema, source: query, variableValues: variables });
      expect(result).to.eql({
        data: {
          updateUser: { id: String(id), name: 'Sample', age: 30 },
        },
      });
      expect(await UserModel.where()).to.eql([{ id, name: 'Sample', age: 30 }]);
    });

    it('omit optional field', async () => {
      const id_to_record_map = await connection.manipulate([{ create_user: { id: 'user', name: 'Test', age: 15 } }]);
      const id = id_to_record_map.user.id;
      const query = 'mutation($input: UpdateUserInput!) { updateUser(input: $input) { id name age } }';
      const variables = { input: { id: String(id), name: 'Sample' } };
      const result = await graphql({ schema, source: query, variableValues: variables });
      expect(result).to.eql({
        data: {
          updateUser: { id: String(id), name: 'Sample', age: 15 },
        },
      });
      expect(await UserModel.where()).to.eql([{ id, name: 'Sample', age: 15 }]);
    });

    it('record not found', async () => {
      const query = 'mutation($input: UpdateUserInput!) { updateUser(input: $input) { id name age } }';
      const variables = { input: { id: '1', name: 'Sample' } };
      const result = await graphql({ schema, source: query, variableValues: variables });
      expect(JSON.parse(JSON.stringify(result))).to.eql({
        data: null,
        errors: [
          {
            locations: [{ column: 38, line: 1 }],
            message: 'not found',
            path: ['updateUser'],
          },
        ],
      });
    });
  });

  describe('delete', () => {
    it('delete one', async () => {
      const id_to_record_map = await connection.manipulate([{ create_user: { id: 'user', name: 'Test', age: 15 } }]);
      const id = id_to_record_map.user.id;
      const query = 'mutation($input: DeleteUserInput!) { deleteUser(input: $input) }';
      const variables = { input: { id: String(id) } };
      const result = await graphql({ schema, source: query, variableValues: variables });
      expect(result).to.eql({
        data: {
          deleteUser: true,
        },
      });
      expect(await UserModel.where()).to.eql([]);
    });

    it('record not found', async () => {
      const query = 'mutation($input: DeleteUserInput!) { deleteUser(input: $input) }';
      const variables = { input: { id: '1' } };
      const result = await graphql({ schema, source: query, variableValues: variables });
      expect(JSON.parse(JSON.stringify(result))).to.eql({
        data: null,
        errors: [
          {
            locations: [{ column: 38, line: 1 }],
            message: 'not found',
            path: ['deleteUser'],
          },
        ],
      });
    });
  });
});
