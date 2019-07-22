// tslint:disable:max-classes-per-file

import { expect } from 'chai';
import * as cormo from 'cormo';
import { GraphQLSchema, printSchema } from 'graphql';
import { BelongsTo, Column, createDefaultCrudSchema, HasMany, Model } from '../..';
import _g = require('../common');

class UserRef extends cormo.BaseModel {
  public name!: string;
  public age?: number | null;
}

class PostRef extends cormo.BaseModel {
  public body!: string;

  public user?: () => UserRef;

  public user_id!: number;
}

describe('createDefaultCrudSchema (association)', () => {
  let connection: cormo.Connection;
  // tslint:disable-next-line:variable-name
  let UserModel: typeof UserRef;
  // tslint:disable-next-line:variable-name
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
    await connection.close();
  });

  it('schema', () => {
    expect(printSchema(schema)).to.eql(`input CreatePostInput {
  body: String!
  user_id: ID!
}

input DeletePostInput {
  id: ID!
}

type Mutation {
  createPost(input: CreatePostInput): Post!
  updatePost(input: UpdatePostInput): Post!
  deletePost(input: DeletePostInput): Boolean!
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

type Query {
  """Single query for Post"""
  post(id: ID): Post

  """List query for Post"""
  post_list(id_list: [ID!]): PostList!
}

input UpdatePostInput {
  id: ID!
  body: String!
  user_id: ID!
}
`);
  });
});
