"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crary_graphql_1 = require("@croquiscom/crary-graphql");
const cormo = __importStar(require("cormo"));
const graphql_1 = require("graphql");
const lodash_1 = __importDefault(require("lodash"));
function getGraphQlType(property) {
    let graphql_type;
    if (property.record_id) {
        return new graphql_1.GraphQLNonNull(graphql_1.GraphQLID);
    }
    else if (property.type_class === cormo.types.Number) {
        graphql_type = graphql_1.GraphQLFloat;
    }
    else if (property.type_class === cormo.types.Integer) {
        graphql_type = graphql_1.GraphQLInt;
    }
    else if (property.type_class === cormo.types.String) {
        graphql_type = graphql_1.GraphQLString;
    }
    else if (property.type_class === cormo.types.Text) {
        graphql_type = graphql_1.GraphQLString;
    }
    else if (property.type_class === cormo.types.Date) {
        graphql_type = crary_graphql_1.CrTimestamp;
    }
    else if (property.type_class === cormo.types.Object) {
        graphql_type = crary_graphql_1.CrJson;
    }
    if (graphql_type && property.required) {
        return new graphql_1.GraphQLNonNull(graphql_type);
    }
    return graphql_type;
}
function createSingleType(model_class, options) {
    const fields = {};
    for (const [column, property] of Object.entries(model_class._schema)) {
        const graphql_type = getGraphQlType(property);
        if (graphql_type) {
            const description = column === 'id'
                ? options.id_description
                : property._graphql && property._graphql.description;
            fields[column] = {
                description,
                type: graphql_type,
            };
        }
    }
    return new graphql_1.GraphQLObjectType({
        description: model_class._graphql && model_class._graphql.description,
        fields,
        name: model_class.name,
    });
}
function createListType(model_class, options, single_type) {
    return new graphql_1.GraphQLObjectType({
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
                            }
                            else {
                                query.where({ [field]: value });
                            }
                        }
                    }
                    return await query.select(crary_graphql_1.getFieldList(info));
                },
                type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(single_type))),
            },
        },
        name: model_class.name + 'List',
    });
}
function createInputType(model_class, options) {
    const fields = {};
    for (const [column, property] of Object.entries(model_class._schema)) {
        if (column === 'id') {
            continue;
        }
        const graphql_type = getGraphQlType(property);
        if (graphql_type) {
            const description = column === 'id'
                ? options.id_description
                : property._graphql && property._graphql.description;
            fields[column] = {
                description,
                type: graphql_type,
            };
        }
    }
    return new graphql_1.GraphQLInputObjectType({
        fields,
        name: `Create${model_class.name}Input`,
    });
}
function updateInputType(model_class, options) {
    const fields = {};
    for (const [column, property] of Object.entries(model_class._schema)) {
        const graphql_type = getGraphQlType(property);
        if (graphql_type) {
            const description = column === 'id'
                ? options.id_description
                : property._graphql && property._graphql.description;
            fields[column] = {
                description,
                type: graphql_type,
            };
        }
    }
    return new graphql_1.GraphQLInputObjectType({
        fields,
        name: `Update${model_class.name}Input`,
    });
}
function createDefaultCrudSchema(model_class, options = {}) {
    const camel_name = model_class.name;
    const snake_name = lodash_1.default.snakeCase(camel_name);
    const single_type = createSingleType(model_class, options);
    const list_type = createListType(model_class, options, single_type);
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
    const create_input_type = createInputType(model_class, options);
    const update_input_type = updateInputType(model_class, options);
    return new graphql_1.GraphQLSchema({
        mutation: new graphql_1.GraphQLObjectType({
            fields: {
                [`create${camel_name}`]: {
                    args: {
                        input: {
                            type: create_input_type,
                        },
                    },
                    async resolve(source, args, context, info) {
                        return await model_class.create(args.input);
                    },
                    type: single_type,
                },
                [`update${camel_name}`]: {
                    args: {
                        input: {
                            type: update_input_type,
                        },
                    },
                    async resolve(source, args, context, info) {
                        await model_class.find(args.input.id).update(args.input);
                        return await model_class.find(args.input.id);
                    },
                    type: single_type,
                },
            },
            name: 'Mutation',
        }),
        query: new graphql_1.GraphQLObjectType({
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
                        return await query.select(crary_graphql_1.getFieldList(info));
                    },
                    type: single_type,
                },
                [snake_name + '_list']: {
                    args: list_query_args,
                    description: `List query for ${camel_name}`,
                    async resolve(source, args, context, info) {
                        return { __args: args };
                    },
                    type: new graphql_1.GraphQLNonNull(list_type),
                },
            },
            name: 'Query',
        }),
    });
}
exports.createDefaultCrudSchema = createDefaultCrudSchema;
