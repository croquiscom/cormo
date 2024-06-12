"use strict";
/* eslint-disable indent */
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdapter = exports.MongoDBAdapter = void 0;
let mongodb;
try {
    mongodb = require('mongodb');
}
catch (error) {
    //
}
class CormoTypesObjectId {
}
const stream_1 = __importDefault(require("stream"));
const lodash_1 = __importDefault(require("lodash"));
const types = __importStar(require("../types"));
const base_1 = require("./base");
function _convertValueToObjectID(value, key) {
    if (value == null) {
        return null;
    }
    try {
        return new mongodb.ObjectID(value);
    }
    catch (error) {
        throw new Error(`'${key}' is not a valid id`);
    }
}
function _objectIdToString(oid) {
    return oid.toString();
}
function _buildWhereSingle(property, key, value, not_op) {
    if (property == null) {
        throw new Error(`unknown column '${key}'`);
    }
    const property_type_class = property.type_class;
    const is_objectid = property_type_class === CormoTypesObjectId;
    if (Array.isArray(value)) {
        if (is_objectid) {
            value = value.map((v) => _convertValueToObjectID(v, key));
        }
        if (not_op) {
            value = { $nin: value };
        }
        else {
            value = { $in: value };
        }
    }
    else if (typeof value === 'object' && value !== null && Object.keys(value).length === 1) {
        const keys = Object.keys(value);
        const sub_key = keys[0];
        switch (sub_key) {
            case '$not':
                return _buildWhereSingle(property, key, value[sub_key], !not_op);
            case '$gt':
            case '$lt':
            case '$gte':
            case '$lte': {
                let sub_value = value[sub_key];
                if (is_objectid) {
                    sub_value = _convertValueToObjectID(sub_value, key);
                }
                else if (property_type_class === types.Date) {
                    sub_value = new Date(sub_value);
                }
                value = lodash_1.default.zipObject([sub_key], [sub_value]);
                if (not_op) {
                    value = { $not: value };
                }
                if (key === 'id') {
                    key = '_id';
                }
                return lodash_1.default.zipObject([key], [value]);
            }
            case '$ceq':
            case '$cne':
            case '$cgt':
            case '$clt':
            case '$cgte':
            case '$clte': {
                const sub_expr = value[sub_key];
                if (sub_expr.substr(0, 1) === '$') {
                    const compare_column = sub_expr.substr(1);
                    if (not_op) {
                        const op = sub_key === '$cgt'
                            ? '<='
                            : sub_key === '$cgte'
                                ? '<'
                                : sub_key === '$clt'
                                    ? '>='
                                    : sub_key === '$clte'
                                        ? '>'
                                        : sub_key === '$ceq'
                                            ? '!='
                                            : '==';
                        return { $where: `this.${key} ${op} this.${compare_column}` };
                    }
                    else {
                        const op = sub_key === '$cgt'
                            ? '>'
                            : sub_key === '$cgte'
                                ? '>='
                                : sub_key === '$clt'
                                    ? '<'
                                    : sub_key === '$clte'
                                        ? '<='
                                        : sub_key === '$ceq'
                                            ? '=='
                                            : '!=';
                        return { $where: `this.${key} ${op} this.${compare_column}` };
                    }
                }
                else {
                    throw new Error(`unknown expression '${sub_expr}'`);
                }
                return lodash_1.default.zipObject([key], [value]);
            }
            case '$contains':
                if (Array.isArray(value[sub_key])) {
                    value = value[sub_key].map((v) => new RegExp(v, 'i'));
                    if (not_op) {
                        value = { $nin: value };
                        not_op = false;
                    }
                    else {
                        value = { $in: value };
                    }
                }
                else {
                    value = new RegExp(value[sub_key], 'i');
                }
                break;
            case '$startswith':
                value = new RegExp('^' + value[sub_key], 'i');
                break;
            case '$endswith':
                value = new RegExp(value[sub_key] + '$', 'i');
                break;
            case '$in':
                if (is_objectid) {
                    value[sub_key] = value[sub_key].map((v) => _convertValueToObjectID(v, key));
                }
                break;
            default:
                throw new Error(`unknown operator '${sub_key}'`);
        }
        if (not_op) {
            value = { $not: value };
        }
    }
    else if (lodash_1.default.isRegExp(value)) {
        if (!value.ignoreCase) {
            value = new RegExp(value.source, 'i');
        }
    }
    else {
        if (is_objectid) {
            value = _convertValueToObjectID(value, key);
        }
        if (not_op) {
            value = { $ne: value };
        }
    }
    if (key === 'id') {
        key = '_id';
    }
    if (property_type_class === types.Date) {
        value = new Date(value);
    }
    return lodash_1.default.zipObject([!property.primary_key ? property._dbname_dot : key], [value]);
}
function _buildWhere(schema, conditions, conjunction = '$and') {
    let subs;
    if (Array.isArray(conditions)) {
        subs = conditions.map((condition) => _buildWhere(schema, condition));
    }
    else if (typeof conditions === 'object') {
        const keys = Object.keys(conditions);
        if (keys.length === 0) {
            return;
        }
        else if (keys.length === 1) {
            const key = keys[0];
            if (key.substr(0, 1) === '$') {
                switch (key) {
                    case '$and':
                        return _buildWhere(schema, conditions[key], '$and');
                    case '$or':
                        return _buildWhere(schema, conditions[key], '$or');
                }
                return;
            }
            else {
                return _buildWhereSingle(schema[key], key, conditions[key]);
            }
        }
        else {
            subs = keys.map((key) => _buildWhereSingle(schema[key], key, conditions[key]));
        }
    }
    else {
        throw new Error(`'${JSON.stringify(conditions)}' is not an object`);
    }
    if (subs.length === 0) {
        //
    }
    else if (subs.length === 1) {
        return subs[0];
    }
    else {
        if (conjunction === '$and') {
            const before_count = lodash_1.default.reduce(subs, (memo, sub) => {
                return memo + Object.keys(sub || {}).length;
            }, 0);
            const obj = lodash_1.default.extend({}, ...subs);
            const keys = Object.keys(obj);
            const after_count = keys.length;
            if (before_count === after_count && !lodash_1.default.some(keys, (key) => key.substr(0, 1) === '$')) {
                return obj;
            }
        }
        return lodash_1.default.zipObject([conjunction], [subs]);
    }
}
function _buildGroupExpr(schema, group_expr) {
    let op = Object.keys(group_expr)[0];
    const sub_expr = group_expr[op];
    if (op === '$any') {
        op = '$first';
    }
    if (typeof sub_expr === 'string' && sub_expr.substr(0, 1) === '$') {
        let column = sub_expr.substr(1);
        column = schema[column]?._dbname_us || column;
        return { [op]: `$${column}` };
    }
    else {
        return { [op]: sub_expr };
    }
}
function _buildGroupFields(model_class, group_by, group_fields) {
    const group = {};
    if (group_by) {
        if (group_by.length === 1) {
            group._id = '$' + group_by[0];
        }
        else {
            group._id = {};
            group_by.forEach((field) => (group._id[field] = '$' + field));
        }
    }
    else {
        group._id = null;
    }
    for (const field in group_fields) {
        const expr = group_fields[field];
        group[field] = _buildGroupExpr(model_class._schema, expr);
    }
    return group;
}
function _processSaveError(error) {
    if (error && (error.code === 11001 || error.code === 11000)) {
        let key = error.message.match(/collection: [\w-.]+ index: (\w+)/);
        if (!key) {
            key = error.message.match(/index: [\w-.]+\$(\w+)(_1)?/);
        }
        return new Error('duplicated ' + (key && key[1]));
    }
    else {
        return base_1.AdapterBase.wrapError('unknown error', error);
    }
}
function _getMongoDBColName(name) {
    // there is a problem with name begins with underscore
    if (name === '_archives') {
        return '@archives';
    }
    else {
        return name;
    }
}
// Adapter for MongoDB
// @namespace adapter
class MongoDBAdapter extends base_1.AdapterBase {
    // Creates a MongoDB adapter
    /** @internal */
    constructor(connection) {
        super();
        /** @internal */
        this.key_type = types.String;
        /** @internal */
        this.key_type_internal = CormoTypesObjectId;
        /** @internal */
        this.support_geopoint = true;
        /** @internal */
        this.support_nested = true;
        this._connection = connection;
        this._collections = {};
    }
    /** @internal */
    async getSchemas() {
        const tables = await this._getTables();
        const table_schemas = {};
        const all_indexes = {};
        for (const table of tables) {
            table_schemas[table] = await this._getSchema(table);
            all_indexes[table] = await this._getIndexes(table);
        }
        return {
            indexes: all_indexes,
            tables: table_schemas,
        };
    }
    /** @internal */
    async createTable(model_name) {
        const collection = this._collection(model_name);
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return;
        }
        const schema = model_class._schema;
        await this._db.createCollection(_getMongoDBColName(model_class.table_name));
        const indexes = [];
        for (const column in schema) {
            const property = schema[column];
            if (property?.type_class === types.GeoPoint) {
                indexes.push([lodash_1.default.zipObject([column], ['2d'])]);
            }
        }
        for (const index of indexes) {
            await collection.createIndex(index[0], index[1]);
        }
    }
    /** @internal */
    async createIndex(model_name, index) {
        const collection = this._collection(model_name);
        const options = {
            name: index.options.name,
            sparse: false,
            unique: index.options.unique,
        };
        if (index.options.unique && !index.options.required) {
            options.sparse = true;
        }
        try {
            await collection.createIndex(index.columns, options);
        }
        catch (error) {
            throw MongoDBAdapter.wrapError('unknown error', error);
        }
    }
    /** @internal */
    async drop(model_name) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return;
        }
        const name = model_class.table_name;
        delete this._collections[name];
        try {
            await this._db.dropCollection(_getMongoDBColName(name));
        }
        catch (error) {
            // ignore not found error
            if (error && error.errmsg !== 'ns not found') {
                throw MongoDBAdapter.wrapError('unknown error', error);
            }
        }
    }
    /** @internal */
    idToDB(value) {
        return _convertValueToObjectID(value, 'id');
    }
    /** @internal */
    valueToDB(value, column, property) {
        if (value == null) {
            return;
        }
        // convert id type
        if (column === 'id' || property.type_class === CormoTypesObjectId) {
            if (property.array) {
                return value.map((v) => v && _convertValueToObjectID(v, column));
            }
            else {
                return _convertValueToObjectID(value, column);
            }
        }
        return value;
    }
    /** @internal */
    async create(model_name, data, options) {
        let result;
        try {
            if (options.use_id_in_data) {
                result = await this._collection(model_name).insertOne({ ...data, _id: data.id }, { safe: true });
            }
            else {
                result = await this._collection(model_name).insertOne(data, { safe: true });
            }
        }
        catch (error) {
            throw _processSaveError(error);
        }
        const id = _objectIdToString(result.insertedId);
        if (id) {
            delete data._id;
            return id;
        }
        else {
            throw new Error('unexpected result');
        }
    }
    /** @internal */
    async createBulk(model_name, data, options) {
        if (data.length > 1000) {
            const chunks = [];
            let i = 0;
            while (i < data.length) {
                chunks.push(data.slice(i, i + 1000));
                i += 1000;
            }
            const ids_all = [];
            for (const chunk of chunks) {
                [].push.apply(ids_all, await this.createBulk(model_name, chunk, options));
            }
            return ids_all;
        }
        let result;
        try {
            if (options.use_id_in_data) {
                result = await this._collection(model_name).insertMany(data.map((item) => ({ ...item, _id: item.id })), { safe: true });
            }
            else {
                result = await this._collection(model_name).insertMany(data, { safe: true });
            }
        }
        catch (e) {
            throw _processSaveError(e);
        }
        let error;
        const ids = Object.values(result.insertedIds).map((inserted_id) => {
            const id = _objectIdToString(inserted_id);
            if (!id) {
                error = new Error('unexpected result');
            }
            return id;
        });
        if (error) {
            throw error;
        }
        else {
            return ids;
        }
    }
    /** @internal */
    async update(model_name, data, _options) {
        const id = data.id;
        delete data.id;
        try {
            await this._collection(model_name).replaceOne({ _id: id }, data, { safe: true });
        }
        catch (error) {
            throw _processSaveError(error);
        }
    }
    /** @internal */
    async updatePartial(model_name, data, conditions_arg, _options) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return 0;
        }
        const schema = model_class._schema;
        let conditions = _buildWhere(schema, conditions_arg);
        if (!conditions) {
            conditions = {};
        }
        const update_ops = {
            $inc: {},
            $set: {},
            $unset: {},
        };
        this._buildUpdateOps(schema, update_ops, data, '', data);
        if (Object.keys(update_ops.$set).length === 0) {
            delete update_ops.$set;
        }
        if (Object.keys(update_ops.$unset).length === 0) {
            delete update_ops.$unset;
        }
        if (Object.keys(update_ops.$inc).length === 0) {
            delete update_ops.$inc;
        }
        try {
            const result = await this._collection(model_name).updateMany(conditions, update_ops, { safe: true, multi: true });
            return result.modifiedCount;
        }
        catch (error) {
            throw _processSaveError(error);
        }
    }
    /** @internal */
    async upsert(model_name, data, conditions_arg, options) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return;
        }
        const schema = model_class._schema;
        let conditions = _buildWhere(schema, conditions_arg);
        if (!conditions) {
            conditions = {};
        }
        const update_ops = {
            $set: {},
            $setOnInsert: {},
            $unset: {},
            $inc: {},
        };
        for (const key in conditions) {
            const value = conditions[key];
            update_ops.$set[key] = value;
        }
        this._buildUpdateOps(schema, update_ops, data, '', data, options.ignore_on_update);
        if (Object.keys(update_ops.$set).length === 0) {
            delete update_ops.$set;
        }
        if (Object.keys(update_ops.$setOnInsert).length === 0) {
            delete update_ops.$setOnInsert;
        }
        if (Object.keys(update_ops.$unset).length === 0) {
            delete update_ops.$unset;
        }
        if (Object.keys(update_ops.$inc).length === 0) {
            delete update_ops.$inc;
        }
        try {
            await this._collection(model_name).updateMany(conditions, update_ops, { safe: true, upsert: true });
        }
        catch (error) {
            throw _processSaveError(error);
        }
    }
    /** @internal */
    async findById(model_name, id, options) {
        const fields = this._buildSelect(options.select);
        try {
            id = _convertValueToObjectID(id, 'id');
        }
        catch (error) {
            throw new Error('not found');
        }
        const client_options = {};
        if (fields) {
            client_options.projection = fields;
        }
        if (options.explain) {
            client_options.explain = true;
            return await this._collection(model_name).findOne({ _id: id }, client_options);
        }
        let result;
        try {
            result = await this._collection(model_name).findOne({ _id: id }, client_options);
        }
        catch (error) {
            throw MongoDBAdapter.wrapError('unknown error', error);
        }
        if (!result) {
            throw new Error('not found');
            return;
        }
        return this._convertToModelInstance(model_name, result, options);
    }
    /** @internal */
    async find(model_name, conditions_arg, options) {
        const [conditions, , orders, client_options] = this._buildConditionsForFind(model_name, conditions_arg, options);
        // console.log(JSON.stringify(conditions));
        if (options.group_by || options.group_fields) {
            const model_class = this._connection.models[model_name];
            if (!model_class) {
                throw new Error('model not found');
            }
            const pipeline = [];
            if (conditions) {
                pipeline.push({ $match: conditions });
            }
            pipeline.push({ $group: _buildGroupFields(model_class, options.group_by, options.group_fields) });
            if (orders) {
                pipeline.push({ $sort: orders });
            }
            if (options.conditions_of_group.length > 0) {
                pipeline.push({ $match: _buildWhere(options.group_fields, options.conditions_of_group) });
            }
            if (options.limit) {
                pipeline.push({ $limit: options.limit });
            }
            if (options.explain) {
                const cursor = await this._collection(model_name).aggregate(pipeline, { explain: true });
                return await cursor.toArray();
            }
            let result;
            try {
                const cursor = await this._collection(model_name).aggregate(pipeline);
                result = await cursor.toArray();
            }
            catch (error) {
                throw MongoDBAdapter.wrapError('unknown error', error);
            }
            return result.map((record) => {
                if (options.group_by) {
                    if (options.group_by.length === 1) {
                        record[options.group_by[0]] = record._id;
                    }
                    else {
                        for (const group of options.group_by) {
                            record[group] = record._id[group];
                        }
                    }
                }
                return this._convertToGroupInstance(model_name, record, options.group_by, options.group_fields, model_class.query_record_id_as_string);
            });
        }
        else {
            if (options.explain) {
                client_options.explain = true;
                const cursor = await this._collection(model_name).find(conditions, client_options);
                return await cursor.toArray();
            }
            let result;
            try {
                const cursor = await this._collection(model_name).find(conditions, client_options);
                if (!cursor) {
                    throw new Error('no cursor');
                }
                result = await cursor.toArray();
            }
            catch (error) {
                throw MongoDBAdapter.wrapError('unknown error', error);
            }
            return result.map((record) => {
                return this._convertToModelInstance(model_name, record, options);
            });
        }
    }
    /** @internal */
    stream(model_name, conditions_arg, options) {
        try {
            const [conditions, , , client_options] = this._buildConditionsForFind(model_name, conditions_arg, options);
            const transformer = new stream_1.default.Transform({ objectMode: true });
            transformer._transform = (record, encoding, callback) => {
                transformer.push(this._convertToModelInstance(model_name, record, options));
                callback();
            };
            try {
                const cursor = this._collection(model_name).find(conditions, client_options).stream();
                cursor
                    .on('error', (e) => {
                    transformer.emit('error', e);
                })
                    .pipe(transformer);
            }
            catch (error) {
                transformer.emit('error', MongoDBAdapter.wrapError('unknown error', error));
            }
            return transformer;
        }
        catch (e) {
            const readable = new stream_1.default.Readable({ objectMode: true });
            readable._read = () => {
                readable.emit('error', e);
            };
            return readable;
        }
    }
    /** @internal */
    async count(model_name, conditions_arg, options) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return 0;
        }
        const conditions = _buildWhere(model_class._schema, conditions_arg);
        // console.log(JSON.stringify(conditions))
        if (options.group_by || options.group_fields) {
            const pipeline = [];
            if (conditions) {
                pipeline.push({ $match: conditions });
            }
            pipeline.push({ $group: _buildGroupFields(model_class, options.group_by, options.group_fields) });
            if (options.conditions_of_group.length > 0) {
                pipeline.push({ $match: _buildWhere(options.group_fields, options.conditions_of_group) });
            }
            pipeline.push({ $group: { _id: null, count: { $sum: 1 } } });
            let result;
            try {
                const cursor = await this._collection(model_name).aggregate(pipeline);
                result = await cursor.toArray();
                if (!result || result.length !== 1) {
                    throw new Error('invalid result');
                }
            }
            catch (error) {
                throw MongoDBAdapter.wrapError('unknown error', error);
            }
            return result[0].count;
        }
        else {
            try {
                const count = await this._collection(model_name).countDocuments(conditions);
                return count;
            }
            catch (error) {
                throw MongoDBAdapter.wrapError('unknown error', error);
            }
        }
    }
    /** @internal */
    async delete(model_name, conditions_arg, options) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return 0;
        }
        if (options.orders.length > 0 || options.limit || options.skip) {
            const [conditions_find, , , client_options] = this._buildConditionsForFind(model_name, conditions_arg, {
                ...options,
                lean: true,
                joins: [],
                conditions_of_group: [],
            });
            const cursor = await this._collection(model_name).find(conditions_find, {
                ...client_options,
                projection: { _id: 1 },
            });
            const records = await cursor.toArray();
            const ids = records.map(this._getModelID);
            conditions_arg = [{ id: { $in: ids } }];
        }
        const conditions = _buildWhere(model_class._schema, conditions_arg);
        try {
            // console.log(JSON.stringify(conditions))
            const result = await this._collection(model_name).deleteMany(conditions, { safe: true });
            return result.deletedCount;
        }
        catch (error) {
            throw MongoDBAdapter.wrapError('unknown error', error);
        }
    }
    /**
     * Connects to the database
     * @internal
     */
    async connect(settings) {
        let url;
        const host = settings.host || 'localhost';
        const port = settings.port || 27017;
        const user = await settings.user;
        const password = await settings.password;
        if (user || password) {
            url = `mongodb://${user}:${password}@${host}:${port}/${settings.database}`;
        }
        else {
            url = `mongodb://${host}:${port}/${settings.database}`;
        }
        try {
            const client = await mongodb.MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
            this._client = client;
            this._db = client.db(settings.database);
        }
        catch (error) {
            throw MongoDBAdapter.wrapError('unknown error', error);
        }
    }
    /** @internal */
    close() {
        if (this._client) {
            this._client.close();
        }
        this._client = null;
        return (this._db = null);
    }
    /**
     * Exposes mongodb module's a collection object
     */
    collection(model_name) {
        return this._collection(model_name);
    }
    /** @internal */
    _getModelID(data) {
        if (!data._id) {
            return null;
        }
        return _objectIdToString(data._id);
    }
    /** @internal */
    valueToModel(value, property, _query_record_id_as_string) {
        if (property.type_class === CormoTypesObjectId) {
            if (property.array) {
                return value.map((v) => v && _objectIdToString(v));
            }
            else {
                return value && _objectIdToString(value);
            }
        }
        else if (property.type_class === types.Blob) {
            return value.read(0, value.length);
        }
        else {
            return value;
        }
    }
    /** @internal */
    _buildSelect(select) {
        if (select) {
            const fields = {};
            select.forEach((column) => {
                if (column !== 'id') {
                    fields[column] = 1;
                }
            });
            if (!select.includes('id')) {
                fields._id = 0;
            }
            return fields;
        }
    }
    /** @internal */
    _collection(model_name) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return;
        }
        const name = model_class.table_name;
        if (!this._collections[name]) {
            return (this._collections[name] = this._db.collection(_getMongoDBColName(name)));
        }
        else {
            return this._collections[name];
        }
    }
    /** @internal */
    async _getTables() {
        const collections = await this._db.listCollections().toArray();
        const tables = collections.map((collection) => collection.name);
        return tables;
    }
    /** @internal */
    async _getSchema(_table) {
        return Promise.resolve('NO SCHEMA');
    }
    /** @internal */
    async _getIndexes(table) {
        const rows = await this._db.collection(table).listIndexes().toArray();
        const indexes = {};
        for (const row of rows) {
            if (row.name === '_id_') {
                continue;
            }
            indexes[row.name] = row.key;
        }
        return indexes;
    }
    /** @internal */
    _buildUpdateOps(schema, update_ops, data, path, object, ignore_on_update) {
        for (const column in object) {
            const value = object[column];
            const property = lodash_1.default.find(schema, { _dbname_dot: path + column });
            if (property) {
                if (property.primary_key) {
                    continue;
                }
                if (value != null) {
                    if (value.$inc != null) {
                        if (ignore_on_update?.includes(column)) {
                            update_ops.$setOnInsert[path + column] = value.$inc;
                        }
                        else {
                            update_ops.$inc[path + column] = value.$inc;
                        }
                    }
                    else {
                        if (ignore_on_update?.includes(column)) {
                            update_ops.$setOnInsert[path + column] = value;
                        }
                        else {
                            update_ops.$set[path + column] = value;
                        }
                    }
                }
                else {
                    update_ops.$unset[path + column] = '';
                }
            }
            else if (typeof object[column] === 'object') {
                this._buildUpdateOps(schema, update_ops, data, path + column + '.', object[column]);
            }
        }
    }
    /** @internal */
    _buildConditionsForFind(model_name, conditions_arg, options) {
        const fields = this._buildSelect(options.select);
        let orders;
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return [undefined, undefined, undefined, {}];
        }
        let conditions = _buildWhere(model_class._schema, conditions_arg);
        if (options.near != null && Object.keys(options.near)[0]) {
            const field = Object.keys(options.near)[0];
            let keys;
            if (conditions) {
                // MongoDB fails if $near is mixed with $and
                keys = Object.keys(conditions);
            }
            if (keys && (keys.length > 1 || keys[0].substr(0, 1) !== '$')) {
                conditions[field] = { $near: options.near[field] };
            }
            else {
                const obj = {};
                obj[field] = { $near: options.near[field] };
                if (conditions) {
                    conditions = { $and: [conditions, obj] };
                }
                else {
                    conditions = obj;
                }
            }
        }
        if (options.orders.length > 0) {
            orders = {};
            options.orders.forEach((order) => {
                let column;
                let dir;
                if (order[0] === '-') {
                    column = order.slice(1);
                    dir = -1;
                }
                else {
                    column = order;
                    dir = 1;
                }
                if (options.group_by) {
                    if (options.group_by.length === 1) {
                        if (column === options.group_by[0]) {
                            column = '_id';
                        }
                    }
                    else {
                        if (options.group_by.indexOf(column) >= 0) {
                            column = '_id.' + column;
                        }
                    }
                }
                else {
                    if (column === 'id') {
                        column = '_id';
                    }
                }
                orders[column] = dir;
                return;
            });
        }
        const client_options = {
            limit: options.limit,
            skip: options.skip,
        };
        if (fields) {
            client_options.projection = fields;
        }
        if (orders) {
            client_options.sort = orders;
        }
        return [conditions, fields, orders, client_options];
    }
}
exports.MongoDBAdapter = MongoDBAdapter;
function createAdapter(connection) {
    if (!mongodb) {
        console.log('Install mongodb module to use this adapter');
        process.exit(1);
    }
    return new MongoDBAdapter(connection);
}
exports.createAdapter = createAdapter;
