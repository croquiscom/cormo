import { CrJson, CrTimestamp, getFieldList } from '@croquiscom/crary-graphql';
import * as cormo from 'cormo';
import {
  GraphQLBoolean, GraphQLFieldConfigArgumentMap, GraphQLFieldConfigMap, GraphQLFloat, GraphQLID,
  GraphQLInputFieldConfigMap, GraphQLInputObjectType, GraphQLInt, GraphQLList,
  GraphQLNonNull, GraphQLObjectType, GraphQLScalarType, GraphQLSchema, GraphQLString,
} from 'graphql';
import _ from 'lodash';

interface IOptions {
  id_description?: string;
  list_type_description?: string;
  item_list_description?: string;
  created_at_column?: string;
  updated_at_column?: string;
}

function getGraphQlType(property: typeof cormo.BaseModel['_schema']['path']) {
  let graphql_type: GraphQLScalarType | undefined;
  if (property.record_id) {
    return new GraphQLNonNull(GraphQLID);
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
  if (graphql_type && property.required) {
    return new GraphQLNonNull(graphql_type);
  }
  return graphql_type;
}

function createSingleType(model_class: typeof cormo.BaseModel, options: IOptions): GraphQLObjectType {
  const fields: GraphQLFieldConfigMap<any, any> = {};
  for (const [column, property] of Object.entries(model_class._schema)) {
    const graphql_type = getGraphQlType(property);
    if (graphql_type) {
      const description = column === 'id'
        ? options.id_description
        : (property as any)._graphql && (property as any)._graphql.description;
      fields[column] = {
        description,
        type: graphql_type,
      };
    }
  }
  return new GraphQLObjectType({
    description: (model_class as any)._graphql && (model_class as any)._graphql.description,
    fields,
    name: model_class.name,
  });
}

function createListType(
  model_class: typeof cormo.BaseModel,
  options: IOptions,
  single_type: GraphQLObjectType,
): GraphQLObjectType {
  return new GraphQLObjectType({
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
    name: model_class.name + 'List',
  });
}

function createCreateInputType(model_class: typeof cormo.BaseModel, options: IOptions) {
  const fields: GraphQLInputFieldConfigMap = {};
  for (const [column, property] of Object.entries(model_class._schema)) {
    if (column === 'id') {
      continue;
    }
    if (column === options.created_at_column) {
      continue;
    }
    if (column === options.updated_at_column) {
      continue;
    }
    const graphql_type = getGraphQlType(property);
    if (graphql_type) {
      const description = column === 'id'
        ? options.id_description
        : (property as any)._graphql && (property as any)._graphql.description;
      fields[column] = {
        description,
        type: graphql_type,
      };
    }
  }
  return new GraphQLInputObjectType({
    fields,
    name: `Create${model_class.name}Input`,
  });
}

function createUpdateInputType(model_class: typeof cormo.BaseModel, options: IOptions) {
  const fields: GraphQLInputFieldConfigMap = {};
  for (const [column, property] of Object.entries(model_class._schema)) {
    if (column === options.created_at_column) {
      continue;
    }
    if (column === options.updated_at_column) {
      continue;
    }
    const graphql_type = getGraphQlType(property);
    if (graphql_type) {
      const description = column === 'id'
        ? options.id_description
        : (property as any)._graphql && (property as any)._graphql.description;
      fields[column] = {
        description,
        type: graphql_type,
      };
    }
  }
  return new GraphQLInputObjectType({
    fields,
    name: `Update${model_class.name}Input`,
  });
}

function createDeleteInputType(model_class: typeof cormo.BaseModel, options: IOptions) {
  const fields: GraphQLInputFieldConfigMap = {};
  fields.id = {
    description: options.id_description,
    type: new GraphQLNonNull(GraphQLID),
  };
  return new GraphQLInputObjectType({
    fields,
    name: `Delete${model_class.name}Input`,
  });
}

export function createDefaultCrudSchema(model_class: typeof cormo.BaseModel, options: IOptions = {}): GraphQLSchema {
  const camel_name = model_class.name;
  const snake_name = _.snakeCase(camel_name);
  const single_type = createSingleType(model_class, options);
  const list_type = createListType(model_class, options, single_type);
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
  const create_input_type = createCreateInputType(model_class, options);
  const update_input_type = createUpdateInputType(model_class, options);
  const delete_input_type = createDeleteInputType(model_class, options);
  return new GraphQLSchema({
    mutation: new GraphQLObjectType({
      fields: {
        [`create${camel_name}`]: {
          args: {
            input: {
              type: create_input_type,
            },
          },
          async resolve(source, args, context, info) {
            const data = args.input;
            const date = Date.now();
            if (options.created_at_column) {
              data[options.created_at_column] = date;
            }
            if (options.updated_at_column) {
              data[options.updated_at_column] = date;
            }
            return await model_class.create(data);
          },
          type: new GraphQLNonNull(single_type),
        },
        [`update${camel_name}`]: {
          args: {
            input: {
              type: update_input_type,
            },
          },
          async resolve(source, args, context, info) {
            const data = args.input;
            const date = Date.now();
            if (options.updated_at_column) {
              data[options.updated_at_column] = date;
            }
            await model_class.find(args.input.id).update(data);
            return await model_class.find(args.input.id);
          },
          type: new GraphQLNonNull(single_type),
        },
        [`delete${camel_name}`]: {
          args: {
            input: {
              type: delete_input_type,
            },
          },
          async resolve(source, args, context, info) {
            const delete_count = await model_class.find(args.input.id).delete();
            if (delete_count === 0) {
              throw new Error('not found');
            }
            return true;
          },
          type: new GraphQLNonNull(GraphQLBoolean),
        },
      },
      name: 'Mutation',
    }),
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
