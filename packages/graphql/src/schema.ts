import { CrJson, CrTimestamp, getFieldList } from '@croquiscom/crary-graphql';
import * as cormo from 'cormo';
import {
  GraphQLFieldConfigArgumentMap, GraphQLFieldConfigMap, GraphQLFloat, GraphQLID, GraphQLInt,
  GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString,
} from 'graphql';
import _ from 'lodash';

interface IOptions {
  id_description?: string;
  list_type_description?: string;
  item_list_description?: string;
}

export function createDefaultCrudSchema(model_class: typeof cormo.BaseModel, options: IOptions = {}): GraphQLSchema {
  const camel_name = model_class.name;
  const snake_name = _.snakeCase(camel_name);
  const fields: GraphQLFieldConfigMap<any, any> = {};
  for (const [column, property] of Object.entries(model_class._schema)) {
    let graphql_type;
    if (property.record_id) {
      graphql_type = GraphQLID;
    } else if (property.type_class === cormo.types.Number) {
      graphql_type = GraphQLFloat;
    } else if (property.type_class === cormo.types.Integer) {
      graphql_type = GraphQLInt;
    } else if (property.type_class === cormo.types.String) {
      graphql_type = GraphQLString;
    } else if (property.type_class === cormo.types.Text) {
      graphql_type = GraphQLString;
    } else if (property.type_class === cormo.types.Date) {
      graphql_type = CrTimestamp;
    } else if (property.type_class === cormo.types.Object) {
      graphql_type = CrJson;
    }
    if (graphql_type) {
      if (property.required) {
        graphql_type = new GraphQLNonNull(graphql_type);
      }
      const description = column === 'id'
        ? options.id_description
        : (property as any)._graphql && (property as any)._graphql.description;
      fields[column] = {
        description,
        type: graphql_type,
      };
    }
  }
  const single_type = new GraphQLObjectType({
    description: (model_class as any)._graphql && (model_class as any)._graphql.description,
    fields,
    name: camel_name,
  });
  const list_type = new GraphQLObjectType({
    description: options.list_type_description,
    fields: {
      item_list: {
        description: options.item_list_description,
        async resolve(source, args, context, info) {
          args = source.__args;
          const query = model_class.query();
          for (const [field, value] of Object.entries(args)) {
            if (value) {
              if (field.endsWith('_list')) {
                query.where({ [field.replace('_list', '')]: value });
              } else {
                query.where({ [field]: value });
              }
            }
          }
          return await query.select(getFieldList(info) as any);
        },
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
          async resolve(source, args, context, info) {
            const query = model_class.query().one();
            let has_query = false;
            for (const [field, value] of Object.entries(args)) {
              if (value) {
                has_query = true;
                query.where({ [field]: value });
              }
            }
            if (!has_query) {
              return null;
            }
            return await query.select(getFieldList(info) as any);
          },
          type: single_type,
        },
        [snake_name + '_list']: {
          args: list_query_args,
          description: `List query for ${camel_name}`,
          async resolve(source, args, context, info) {
            return { __args: args };
          },
          type: new GraphQLNonNull(list_type),
        },
      },
      name: 'Query',
    }),
  });
}
