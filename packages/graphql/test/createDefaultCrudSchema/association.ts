import { expect } from 'chai';
import * as cormo from 'cormo';
import { graphql, GraphQLSchema, printSchema } from 'graphql';
import { BelongsTo, Column, createDefaultCrudSchema, Model } from '../..';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import _g = require('../common');

class UserRef extends cormo.BaseModel {
  public name!: string;
  public age?: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class PostRef extends cormo.BaseModel {
  public body!: string;

  public user?: () => UserRef;

  public user_id!: number;
}

describe('createDefaultCrudSchema (association)', () => {
  let connection: cormo.Connection;
  let UserModel: typeof UserRef;
  let PostModel: typeof PostRef;
  let schema: GraphQLSchema;

  before(() => {
    connection = new cormo.Connection('mysql', _g.db_configs.mysql);

    @Model({ connection, description: 'A user model' })
    class User extends cormo.BaseModel {
      @Column({ type: String, required: true })
      public name!: string;

      @Column({ type: cormo.types.Integer })
      public age?: number;
    }
    UserModel = User;

    @Model({ connection, description: 'A post model' })
    class Post extends cormo.BaseModel {
      @Column({ type: String, required: true })
      public body!: string;

      @BelongsTo({ required: true })
      public user?: () => User;
      public user_id!: number;
    }
    PostModel = Post;

    schema = createDefaultCrudSchema(Post, {});
  });

  afterEach(async () => {
    await UserModel.deleteAll();
    await PostModel.deleteAll();
  });

  after(async () => {
    await UserModel.drop();
    await PostModel.drop();
    connection.close();
  });

  it('schema', () => {
    expect(printSchema(schema)).to.eql(`type Query {
  """Single query for Post"""
  post(id: ID): Post

  """List query for Post"""
  post_list(id_list: [ID!], body: String, body_istartswith: String, body_icontains: String, user_id: ID, order: PostOrderType, limit_count: Int, skip_count: Int): PostList!
}

"""A post model"""
type Post {
  id: ID!
  body: String!
  user_id: ID!
}

type PostList {
  item_list: [Post!]!
}

enum PostOrderType {
  ID_ASC
  ID_DESC
  BODY_ASC
  BODY_DESC
  USER_ID_ASC
  USER_ID_DESC
}

type Mutation {
  createPost(input: CreatePostInput): Post!
  updatePost(input: UpdatePostInput): Post!
  deletePost(input: DeletePostInput): Boolean!
}

input CreatePostInput {
  body: String!
  user_id: ID!
}

input UpdatePostInput {
  id: ID!
  body: String!
  user_id: ID!
}

input DeletePostInput {
  id: ID!
}`);
  });

  describe('list query', () => {
    describe('generated arguments', () => {
      it('record id match', async () => {
        const id_to_record_map = await connection.manipulate([
          { create_user: { id: 'user1', name: 'Test', age: 15 } },
          { create_user: { id: 'user2', name: 'Test Sample', age: 30 } },
          { create_post: { id: 'post1', user_id: 'user1', body: 'AA' } },
          { create_post: { id: 'post2', user_id: 'user2', body: 'BB' } },
          { create_post: { id: 'post3', user_id: 'user1', body: 'CC' } },
        ]);
        const query = 'query($user_id: ID) { post_list(user_id: $user_id) { item_list { id } } }';
        const variables = { user_id: String(id_to_record_map.user1.id) };
        const result = await graphql({ schema, source: query, variableValues: variables });
        expect(result).to.eql({
          data: {
            post_list: {
              item_list: [{ id: String(id_to_record_map.post1.id) }, { id: String(id_to_record_map.post3.id) }],
            },
          },
        });
      });
    });
  });
});
