"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
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
                return memo + Object.keys(sub).length;
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
        column = schema[column] && schema[column]._dbname_us || column;
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
            group_by.forEach((field) => group._id[field] = '$' + field);
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
    async createTable(model) {
        const collection = this._collection(model);
        const model_class = this._connection.models[model];
        const schema = model_class._schema;
        await this._db.createCollection(_getMongoDBColName(model_class.table_name));
        const indexes = [];
        for (const column in schema) {
            const property = schema[column];
            if (property.type_class === types.GeoPoint) {
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
    async drop(model) {
        const name = this._connection.models[model].table_name;
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
    async create(model, data, options) {
        let result;
        try {
            result = await this._collection(model).insertOne(data, { safe: true });
        }
        catch (error) {
            throw _processSaveError(error);
        }
        const id = _objectIdToString(result.ops[0]._id);
        if (id) {
            delete data._id;
            return id;
        }
        else {
            throw new Error('unexpected result');
        }
    }
    /** @internal */
    async createBulk(model, data, options) {
        if (data.length > 1000) {
            const chunks = [];
            let i = 0;
            while (i < data.length) {
                chunks.push(data.slice(i, i + 1000));
                i += 1000;
            }
            const ids_all = [];
            for (const chunk of chunks) {
                [].push.apply(ids_all, await this.createBulk(model, chunk, options));
            }
            return ids_all;
        }
        let result;
        try {
            result = (await this._collection(model).insertMany(data, { safe: true }));
        }
        catch (e) {
            throw _processSaveError(e);
        }
        let error;
        const ids = result.ops.map((doc) => {
            const id = _objectIdToString(doc._id);
            if (id) {
                delete doc._id;
            }
            else {
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
    async update(model, data, options) {
        const id = data.id;
        delete data.id;
        try {
            await this._collection(model).replaceOne({ _id: id }, data, { safe: true });
        }
        catch (error) {
            throw _processSaveError(error);
        }
    }
    /** @internal */
    async updatePartial(model, data, conditions, options) {
        const schema = this._connection.models[model]._schema;
        conditions = _buildWhere(schema, conditions);
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
            const result = await this._collection(model).updateMany(conditions, update_ops, { safe: true, multi: true });
            return result.result.n;
        }
        catch (error) {
            throw _processSaveError(error);
        }
    }
    /** @internal */
    async upsert(model, data, conditions, options) {
        const schema = this._connection.models[model]._schema;
        conditions = _buildWhere(schema, conditions);
        if (!conditions) {
            conditions = {};
        }
        const update_ops = {
            $inc: {},
            $set: {},
            $unset: {},
        };
        for (const key in conditions) {
            const value = conditions[key];
            update_ops.$set[key] = value;
        }
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
            await this._collection(model).updateMany(conditions, update_ops, { safe: true, upsert: true });
        }
        catch (error) {
            throw _processSaveError(error);
        }
    }
    /** @internal */
    async findById(model, id, options) {
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
            return await this._collection(model).findOne({ _id: id }, client_options);
        }
        let result;
        try {
            result = await this._collection(model).findOne({ _id: id }, client_options);
        }
        catch (error) {
            throw MongoDBAdapter.wrapError('unknown error', error);
        }
        if (!result) {
            throw new Error('not found');
            return;
        }
        return this._convertToModelInstance(model, result, options);
    }
    /** @internal */
    async find(model_name, conditions, options) {
        let fields;
        let orders;
        let client_options;
        [conditions, fields, orders, client_options] = this._buildConditionsForFind(model_name, conditions, options);
        // console.log(JSON.stringify(conditions));
        if (options.group_by || options.group_fields) {
            const model_class = this._connection.models[model_name];
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
                return this._convertToGroupInstance(model_name, record, options.group_by, options.group_fields);
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
    stream(model, conditions, options) {
        let fields;
        let orders;
        let client_options;
        try {
            [conditions, fields, orders, client_options] = this._buildConditionsForFind(model, conditions, options);
        }
        catch (e) {
            const readable = new stream_1.default.Readable({ objectMode: true });
            readable._read = () => {
                readable.emit('error', e);
            };
            return readable;
        }
        const transformer = new stream_1.default.Transform({ objectMode: true });
        transformer._transform = (record, encoding, callback) => {
            transformer.push(this._convertToModelInstance(model, record, options));
            callback();
        };
        this._collection(model).find(conditions, client_options, (error, cursor) => {
            if (error || !cursor) {
                transformer.emit('error', MongoDBAdapter.wrapError('unknown error', error));
                return;
            }
            cursor.on('error', (e) => {
                transformer.emit('error', e);
            }).pipe(transformer);
        });
        return transformer;
    }
    /** @internal */
    async count(model_name, conditions, options) {
        const model_class = this._connection.models[model_name];
        conditions = _buildWhere(model_class._schema, conditions);
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
    async delete(model, conditions, options) {
        const model_class = this._connection.models[model];
        conditions = _buildWhere(model_class._schema, conditions);
        try {
            // console.log(JSON.stringify(conditions))
            const result = await this._collection(model).deleteMany(conditions, { safe: true });
            return result.result.n;
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
        if (settings.user || settings.password) {
            const host = settings.host || 'localhost';
            const port = settings.port || 27017;
            url = `mongodb://${settings.user}:${settings.password}@${host}:${port}/${settings.database}`;
        }
        else {
            url = `mongodb://${settings.host || 'localhost'}:${settings.port || 27017}/${settings.database}`;
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
        return this._db = null;
    }
    /**
     * Exposes mongodb module's a collection object
     */
    collection(model) {
        return this._collection(model);
    }
    /** @internal */
    _getModelID(data) {
        if (!data._id) {
            return null;
        }
        return _objectIdToString(data._id);
    }
    /** @internal */
    valueToModel(value, property) {
        if (property.type_class === CormoTypesObjectId) {
            if (property.array) {
                return value.map((v) => v && _objectIdToString(v));
            }
            else {
                return value && _objectIdToString(value);
            }
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
    _collection(model) {
        const name = this._connection.models[model].table_name;
        if (!this._collections[name]) {
            return this._collections[name] = this._db.collection(_getMongoDBColName(name));
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
    async _getSchema(table) {
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
    _buildUpdateOps(schema, update_ops, data, path, object) {
        for (const column in object) {
            const value = object[column];
            const property = lodash_1.default.find(schema, { _dbname_dot: path + column });
            if (property) {
                if (property.primary_key) {
                    continue;
                }
                if (value != null) {
                    if (value.$inc != null) {
                        update_ops.$inc[path + column] = value.$inc;
                    }
                    else {
                        update_ops.$set[path + column] = value;
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
    _buildConditionsForFind(model, conditions, options) {
        const fields = this._buildSelect(options.select);
        let orders;
        conditions = _buildWhere(this._connection.models[model]._schema, conditions);
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
