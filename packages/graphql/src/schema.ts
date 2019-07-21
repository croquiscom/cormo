import * as cormo from 'cormo';
import {
  GraphQLFieldConfigArgumentMap, GraphQLID, GraphQLList,
  GraphQLNonNull, GraphQLObjectType, GraphQLSchema,
} from 'graphql';
import _ from 'lodash';

export function createDefaultCrudSchema(model_class: typeof cormo.BaseModel): GraphQLSchema {
  const camel_name = model_class.name;
  const snake_name = _.snakeCase(camel_name);
  const single_type = new GraphQLObjectType({
    fields: {
      id: {
        type: GraphQLID,
      },
    },
    name: camel_name,
  });
  const list_type = new GraphQLObjectType({
    fields: {
      item_list: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(single_type))),
      },
    },
    name: camel_name + 'List',
  });
  const single_query_args: GraphQLFieldConfigArgumentMap = {
    id: {
      type: GraphQLID,
    },
  };
  const list_query_args: GraphQLFieldConfigArgumentMap = {
  };
  // tslint:disable-next-line: forin
  for (const [column, property] of Object.entries(model_class._schema)) {
    if (column === 'id') {
      list_query_args[column + '_list'] = {
        type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
      };
    }
  }
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      fields: {
        [snake_name]: {
          args: single_query_args,
          description: `Single query for ${camel_name}`,
          type: single_type,
        },
        [snake_name + '_list']: {
          args: list_query_args,
          description: `List query for ${camel_name}`,
          type: new GraphQLNonNull(list_type),
        },
      },
      name: 'Query',
    }),
  });
}
