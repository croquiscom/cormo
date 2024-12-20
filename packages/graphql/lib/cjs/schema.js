"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultCrudSchema = createDefaultCrudSchema;
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
        if (!property) {
            continue;
        }
        const graphql_type = getGraphQlType(property);
        if (graphql_type) {
            const description = column === 'id' ? options.id_description : property.description;
            fields[column] = {
                description,
                type: graphql_type,
            };
        }
    }
    return new graphql_1.GraphQLObjectType({
        description: model_class.description,
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
                                query.where({ [field.replace(/_list$/, '')]: value });
                            }
                            else if (field.endsWith('_istartswith')) {
                                query.where({ [field.replace(/_istartswith$/, '')]: { $startswith: value } });
                            }
                            else if (field.endsWith('_icontains')) {
                                query.where({ [field.replace(/_icontains$/, '')]: { $contains: value } });
                            }
                            else if (field.endsWith('_gte')) {
                                query.where({ [field.replace(/_gte$/, '')]: { $gte: value } });
                            }
                            else if (field.endsWith('_gt')) {
                                query.where({ [field.replace(/_gt$/, '')]: { $gt: value } });
                            }
                            else if (field.endsWith('_lte')) {
                                query.where({ [field.replace(/_lte$/, '')]: { $lte: value } });
                            }
                            else if (field.endsWith('_lt')) {
                                query.where({ [field.replace(/_lt$/, '')]: { $lt: value } });
                            }
                            else if (field === 'order') {
                                query.order(value);
                            }
                            else if (field === 'limit_count') {
                                query.limit(value);
                            }
                            else if (field === 'skip_count') {
                                query.skip(value);
                            }
                            else {
                                query.where({ [field]: value });
                            }
                        }
                    }
                    return await query.select((0, crary_graphql_1.getFieldList)(info));
                },
                type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(single_type))),
            },
        },
        name: model_class.name + 'List',
    });
}
function createCreateInputType(model_class, options) {
    const fields = {};
    for (const [column, property] of Object.entries(model_class._schema)) {
        if (!property) {
            continue;
        }
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
            const description = column === 'id' ? options.id_description : property.description;
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
function createUpdateInputType(model_class, options) {
    const fields = {};
    for (const [column, property] of Object.entries(model_class._schema)) {
        if (!property) {
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
            const description = column === 'id' ? options.id_description : property.description;
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
function createDeleteInputType(model_class, options) {
    const fields = {};
    fields.id = {
        description: options.id_description,
        type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID),
    };
    return new graphql_1.GraphQLInputObjectType({
        fields,
        name: `Delete${model_class.name}Input`,
    });
}
function createOrderType(model_class, _options) {
    const values = {};
    for (const [column, property] of Object.entries(model_class._schema)) {
        if (!property) {
            continue;
        }
        if (column === 'id' ||
            property.type_class === cormo.types.String ||
            property.type_class === cormo.types.Integer ||
            property.type_class === cormo.types.BigInteger) {
            values[column.toUpperCase() + '_ASC'] = {
                value: column,
            };
            values[column.toUpperCase() + '_DESC'] = {
                value: '-' + column,
            };
        }
    }
    return new graphql_1.GraphQLEnumType({
        name: `${model_class.name}OrderType`,
        values,
    });
}
function buildListQueryArgs(model_class, options) {
    const list_query_args = {};
    for (const [column, property] of Object.entries(model_class._schema)) {
        if (!property) {
            continue;
        }
        if (column === 'id') {
            list_query_args[column + '_list'] = {
                type: new graphql_1.GraphQLList(new graphql_1.GraphQLNonNull(graphql_1.GraphQLID)),
            };
        }
        else if (property.record_id) {
            list_query_args[column] = {
                type: graphql_1.GraphQLID,
            };
        }
        else if (property.type_class === cormo.types.String || property.type_class === cormo.types.Text) {
            list_query_args[column] = {
                type: graphql_1.GraphQLString,
            };
            list_query_args[column + '_istartswith'] = {
                type: graphql_1.GraphQLString,
            };
            list_query_args[column + '_icontains'] = {
                type: graphql_1.GraphQLString,
            };
        }
        else if (property.type_class === cormo.types.Integer) {
            list_query_args[column] = {
                type: graphql_1.GraphQLInt,
            };
            list_query_args[column + '_gte'] = {
                type: graphql_1.GraphQLInt,
            };
            list_query_args[column + '_gt'] = {
                type: graphql_1.GraphQLInt,
            };
            list_query_args[column + '_lte'] = {
                type: graphql_1.GraphQLInt,
            };
            list_query_args[column + '_lt'] = {
                type: graphql_1.GraphQLInt,
            };
        }
    }
    list_query_args.order = {
        type: createOrderType(model_class, options),
    };
    list_query_args.limit_count = {
        type: graphql_1.GraphQLInt,
    };
    list_query_args.skip_count = {
        type: graphql_1.GraphQLInt,
    };
    return list_query_args;
}
function createDefaultCrudSchema(model_class, options = {}) {
    model_class._connection.applyAssociations();
    const camel_name = model_class.name;
    const snake_name = lodash_1.default.snakeCase(camel_name);
    const single_type = createSingleType(model_class, options);
    const list_type = createListType(model_class, options, single_type);
    const single_query_args = {
        id: {
            type: graphql_1.GraphQLID,
        },
    };
    const list_query_args = buildListQueryArgs(model_class, options);
    const create_input_type = createCreateInputType(model_class, options);
    const update_input_type = createUpdateInputType(model_class, options);
    const delete_input_type = createDeleteInputType(model_class, options);
    return new graphql_1.GraphQLSchema({
        mutation: new graphql_1.GraphQLObjectType({
            fields: {
                [`create${camel_name}`]: {
                    args: {
                        input: {
                            type: create_input_type,
                        },
                    },
                    async resolve(source, args) {
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
                    type: new graphql_1.GraphQLNonNull(single_type),
                },
                [`update${camel_name}`]: {
                    args: {
                        input: {
                            type: update_input_type,
                        },
                    },
                    async resolve(_source, args) {
                        const data = args.input;
                        const date = Date.now();
                        if (options.updated_at_column) {
                            data[options.updated_at_column] = date;
                        }
                        await model_class.find(args.input.id).update(data);
                        return await model_class.find(args.input.id);
                    },
                    type: new graphql_1.GraphQLNonNull(single_type),
                },
                [`delete${camel_name}`]: {
                    args: {
                        input: {
                            type: delete_input_type,
                        },
                    },
                    async resolve(source, args) {
                        const delete_count = await model_class.find(args.input.id).delete();
                        if (delete_count === 0) {
                            throw new Error('not found');
                        }
                        return true;
                    },
                    type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLBoolean),
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
                        return await query.select((0, crary_graphql_1.getFieldList)(info));
                    },
                    type: single_type,
                },
                [snake_name + '_list']: {
                    args: list_query_args,
                    description: `List query for ${camel_name}`,
                    resolve(source, args) {
                        return { __args: args };
                    },
                    type: new graphql_1.GraphQLNonNull(list_type),
                },
            },
            name: 'Query',
        }),
    });
}
