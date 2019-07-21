"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const lodash_1 = __importDefault(require("lodash"));
function createDefaultCrudSchema(model_class, options = {}) {
    const camel_name = model_class.name;
    const snake_name = lodash_1.default.snakeCase(camel_name);
    const single_type = new graphql_1.GraphQLObjectType({
        description: model_class._graphql && model_class._graphql.description,
        fields: {
            id: {
                type: graphql_1.GraphQLID,
            },
        },
        name: camel_name,
    });
    const list_type = new graphql_1.GraphQLObjectType({
        description: options.list_type_description,
        fields: {
            item_list: {
                description: options.item_list_description,
                type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(single_type))),
            },
        },
        name: camel_name + 'List',
    });
    const single_query_args = {
        id: {
            type: graphql_1.GraphQLID,
        },
    };
    const list_query_args = {};
    // tslint:disable-next-line: forin
    for (const [column, property] of Object.entries(model_class._schema)) {
        if (column === 'id') {
            list_query_args[column + '_list'] = {
                type: new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(graphql_1.GraphQLID)),
            };
        }
    }
    return new graphql_1.GraphQLSchema({
        query: new graphql_1.GraphQLObjectType({
            fields: {
                [snake_name]: {
                    args: single_query_args,
                    description: `Single query for ${camel_name}`,
                    type: single_type,
                },
                [snake_name + '_list']: {
                    args: list_query_args,
                    description: `List query for ${camel_name}`,
                    type: new graphql_1.GraphQLNonNull(list_type),
                },
            },
            name: 'Query',
        }),
    });
}
exports.createDefaultCrudSchema = createDefaultCrudSchema;
