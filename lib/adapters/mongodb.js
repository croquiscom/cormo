"use strict";
// tslint:disable:max-classes-per-file
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
let mongodb;
try {
    // tslint:disable-next-line:no-var-requires
    mongodb = require('mongodb');
}
catch (error) {
    console.log('Install mongodb module to use this adapter');
    process.exit(1);
}
const ObjectID = mongodb.ObjectID;
class CormoTypesObjectId {
}
const _ = require("lodash");
const stream = require("stream");
const types = require("../types");
const base_1 = require("./base");
function _convertValueToObjectID(value, key) {
    if (value == null) {
        return null;
    }
    try {
        return new ObjectID(value);
    }
    catch (error) {
        throw new Error(`'${key}' is not a valid id`);
    }
}
function _objectIdToString(oid) {
    return oid.toString();
}
function _buildWhereSingle(property, key, value, not_op) {
    if (key !== 'id' && (property == null)) {
        throw new Error(`unknown column '${key}'`);
    }
    const property_type_class = property != null ? property.type_class : void 0;
    const is_objectid = key === 'id' || property_type_class === CormoTypesObjectId;
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
            case '$lte':
                let sub_value = value[sub_key];
                if (is_objectid) {
                    sub_value = _convertValueToObjectID(sub_value, key);
                }
                else if (property_type_class === types.Date) {
                    sub_value = new Date(sub_value);
                }
                value = _.zipObject([sub_key], [sub_value]);
                if (not_op) {
                    value = { $not: value };
                }
                if (key === 'id') {
                    key = '_id';
                }
                return _.zipObject([key], [value]);
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
    else if (_.isRegExp(value)) {
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
    return _.zipObject([key], [value]);
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
            const before_count = _.reduce(subs, (memo, sub) => {
                return memo + Object.keys(sub).length;
            }, 0);
            subs.unshift({});
            const obj = _.extend.apply(_, subs);
            subs.shift();
            const keys = Object.keys(obj);
            const after_count = keys.length;
            if (before_count === after_count && !_.some(keys, (key) => key.substr(0, 1) === '$')) {
                return obj;
            }
        }
        return _.zipObject([conjunction], [subs]);
    }
}
function _buildGroupFields(group_by, group_fields) {
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
    // tslint:disable-next-line:forin
    for (const field in group_fields) {
        const expr = group_fields[field];
        group[field] = expr;
    }
    return group;
}
function _processSaveError(error) {
    if (error && (error.code === 11001 || error.code === 11000)) {
        let key = error.message.match(/collection: [\w-.]+ index: (\w+)/);
        if (!key) {
            key = error.message.match(/index: [\w-.]+\$(\w+)(_1)?/);
        }
        return new Error('duplicated ' + (key != null ? key[1] : void 0));
    }
    else {
        return MongoDBAdapter.wrapError('unknown error', error);
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
    constructor(connection) {
        super();
        this.key_type = types.String;
        this.key_type_internal = CormoTypesObjectId;
        this.support_geopoint = true;
        this.support_nested = true;
        this._connection = connection;
        this._collections = {};
    }
    getSchemas() {
        return __awaiter(this, void 0, void 0, function* () {
            const tables = yield this._getTables();
            const table_schemas = {};
            const all_indexes = {};
            for (const table of tables) {
                table_schemas[table] = yield this._getSchema(table);
                all_indexes[table] = yield this._getIndexes(table);
            }
            return {
                indexes: all_indexes,
                tables: table_schemas,
            };
        });
    }
    createTable(model) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this._collection(model);
            const indexes = [];
            const schema = this._connection.models[model]._schema;
            // tslint:disable-next-line:forin
            for (const column in schema) {
                const property = schema[column];
                if (property.type_class === types.GeoPoint) {
                    indexes.push([_.zipObject([column], ['2d'])]);
                }
            }
            for (const index of indexes) {
                yield collection.ensureIndex(index[0], index[1]);
            }
        });
    }
    createIndex(model, index) {
        return __awaiter(this, void 0, void 0, function* () {
            const collection = this._collection(model);
            const options = {
                name: index.options.name,
                sparse: false,
                unique: index.options.unique,
            };
            if (index.options.unique && !index.options.required) {
                options.sparse = true;
            }
            try {
                yield collection.ensureIndex(index.columns, options);
            }
            catch (error) {
                throw MongoDBAdapter.wrapError('unknown error', error);
            }
        });
    }
    drop(model) {
        return __awaiter(this, void 0, void 0, function* () {
            const name = this._connection.models[model].tableName;
            delete this._collections[name];
            try {
                yield this._db.dropCollection(_getMongoDBColName(name));
            }
            catch (error) {
                // ignore not found error
                if (error && error.errmsg !== 'ns not found') {
                    throw MongoDBAdapter.wrapError('unknown error', error);
                }
            }
        });
    }
    idToDB(value) {
        return _convertValueToObjectID(value, 'id');
    }
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
    create(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            let result;
            try {
                result = yield this._collection(model).insert(data, { safe: true });
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
        });
    }
    createBulk(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (data.length > 1000) {
                const chunks = [];
                let i = 0;
                while (i < data.length) {
                    chunks.push(data.slice(i, i + 1000));
                    i += 1000;
                }
                const ids_all = [];
                for (const chunk of chunks) {
                    [].push.apply(ids_all, yield this.createBulk(model, chunk));
                }
                return ids_all;
            }
            let result;
            try {
                result = (yield this._collection(model).insert(data, { safe: true }));
            }
            catch (error) {
                throw _processSaveError(error);
            }
            let error;
            const ids = result.ops.map((doc) => {
                const id = _objectIdToString(doc._id);
                if (id) {
                    delete data._id;
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
        });
    }
    update(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = data.id;
            delete data.id;
            try {
                yield this._collection(model).update({ _id: id }, data, { safe: true });
            }
            catch (error) {
                throw _processSaveError(error);
            }
        });
    }
    updatePartial(model, data, conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const result = yield this._collection(model).update(conditions, update_ops, { safe: true, multi: true });
                return result.result.n;
            }
            catch (error) {
                throw _processSaveError(error);
            }
        });
    }
    upsert(model, data, conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
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
            // tslint:disable-next-line:forin
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
                yield this._collection(model).update(conditions, update_ops, { safe: true, upsert: true });
            }
            catch (error) {
                throw _processSaveError(error);
            }
        });
    }
    findById(model, id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let fields;
            if (options.select) {
                fields = {};
                options.select.forEach((column) => fields[column] = 1);
            }
            try {
                id = _convertValueToObjectID(id, 'id');
            }
            catch (error) {
                throw new Error('not found');
            }
            const client_options = {};
            if (fields) {
                client_options.fields = fields;
            }
            if (options.explain) {
                client_options.explain = true;
                return yield this._collection(model).findOne({ _id: id }, client_options);
            }
            let result;
            try {
                result = yield this._collection(model).findOne({ _id: id }, client_options);
            }
            catch (error) {
                throw MongoDBAdapter.wrapError('unknown error', error);
            }
            if (!result) {
                throw new Error('not found');
                return;
            }
            return this._convertToModelInstance(model, result, options);
        });
    }
    find(model, conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let fields;
            let orders;
            let client_options;
            [conditions, fields, orders, client_options] = this._buildConditionsForFind(model, conditions, options);
            // console.log(JSON.stringify(conditions))
            if (options.group_by || options.group_fields) {
                const pipeline = [];
                if (conditions) {
                    pipeline.push({ $match: conditions });
                }
                pipeline.push({ $group: _buildGroupFields(options.group_by, options.group_fields) });
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
                    const cursor = yield this._collection(model).aggregate(pipeline, { explain: true });
                    return yield cursor.toArray();
                }
                let result;
                try {
                    const cursor = yield this._collection(model).aggregate(pipeline);
                    result = yield cursor.toArray();
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
                    return this._convertToGroupInstance(model, record, options.group_by, options.group_fields);
                });
            }
            else {
                if (options.explain) {
                    client_options.explain = true;
                    const cursor = yield this._collection(model).find(conditions, client_options);
                    return yield cursor.toArray();
                }
                let result;
                try {
                    const cursor = yield this._collection(model).find(conditions, client_options);
                    if (!cursor) {
                        throw new Error('no cursor');
                    }
                    result = yield cursor.toArray();
                }
                catch (error) {
                    throw MongoDBAdapter.wrapError('unknown error', error);
                }
                return result.map((record) => {
                    return this._convertToModelInstance(model, record, options);
                });
            }
        });
    }
    stream(model, conditions, options) {
        let fields;
        let orders;
        let client_options;
        try {
            [conditions, fields, orders, client_options] = this._buildConditionsForFind(model, conditions, options);
        }
        catch (e) {
            const readable = new stream.Readable({ objectMode: true });
            readable._read = () => {
                readable.emit('error', e);
            };
            return readable;
        }
        const transformer = new stream.Transform({ objectMode: true });
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
    count(model, conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            conditions = _buildWhere(this._connection.models[model]._schema, conditions);
            // console.log(JSON.stringify(conditions))
            if (options.group_by || options.group_fields) {
                const pipeline = [];
                if (conditions) {
                    pipeline.push({ $match: conditions });
                }
                pipeline.push({ $group: _buildGroupFields(options.group_by, options.group_fields) });
                if (options.conditions_of_group.length > 0) {
                    pipeline.push({ $match: _buildWhere(options.group_fields, options.conditions_of_group) });
                }
                pipeline.push({ $group: { _id: null, count: { $sum: 1 } } });
                let result;
                try {
                    const cursor = yield this._collection(model).aggregate(pipeline);
                    result = yield cursor.toArray();
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
                    const count = yield this._collection(model).countDocuments(conditions);
                    return count;
                }
                catch (error) {
                    throw MongoDBAdapter.wrapError('unknown error', error);
                }
            }
        });
    }
    delete(model, conditions) {
        return __awaiter(this, void 0, void 0, function* () {
            const model_class = this._connection.models[model];
            conditions = _buildWhere(model_class._schema, conditions);
            try {
                // console.log(JSON.stringify(conditions))
                const result = yield this._collection(model).remove(conditions, { safe: true });
                return result.result.n;
            }
            catch (error) {
                throw MongoDBAdapter.wrapError('unknown error', error);
            }
        });
    }
    /**
     * Connects to the database
     */
    connect(settings) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const client = yield mongodb.MongoClient.connect(url, { useNewUrlParser: true });
                this._client = client;
                this._db = client.db(settings.database);
            }
            catch (error) {
                throw MongoDBAdapter.wrapError('unknown error', error);
            }
        });
    }
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
    _getModelID(data) {
        return _objectIdToString(data._id);
    }
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
    _collection(model) {
        const name = this._connection.models[model].tableName;
        if (!this._collections[name]) {
            return this._collections[name] = this._db.collection(_getMongoDBColName(name));
        }
        else {
            return this._collections[name];
        }
    }
    _getTables() {
        return __awaiter(this, void 0, void 0, function* () {
            const collections = yield this._db.listCollections().toArray();
            const tables = collections.map((collection) => collection.name);
            return tables;
        });
    }
    _getSchema(table) {
        return __awaiter(this, void 0, void 0, function* () {
            return 'NO SCHEMA';
        });
    }
    _getIndexes(table) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this._db.collection(table).listIndexes().toArray();
            const indexes = {};
            for (const row of rows) {
                indexes[row.name] = row.key;
            }
            return indexes;
        });
    }
    _buildUpdateOps(schema, update_ops, data, path, object) {
        const results = [];
        // tslint:disable-next-line:forin
        for (const column in object) {
            const value = object[column];
            const property = schema[path + column];
            if (property) {
                if (value != null) {
                    if (value.$inc != null) {
                        results.push(update_ops.$inc[path + column] = value.$inc);
                    }
                    else {
                        results.push(update_ops.$set[path + column] = value);
                    }
                }
                else {
                    results.push(update_ops.$unset[path + column] = '');
                }
            }
            else if (typeof object[column] === 'object') {
                results.push(this._buildUpdateOps(schema, update_ops, data, path + column + '.', object[column]));
            }
            else {
                results.push(void 0);
            }
        }
        return results;
    }
    _buildConditionsForFind(model, conditions, options) {
        let fields;
        let orders;
        if (options.select) {
            fields = {};
            options.select.forEach((column) => fields[column] = 1);
        }
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
            client_options.fields = fields;
        }
        if (orders) {
            client_options.sort = orders;
        }
        return [conditions, fields, orders, client_options];
    }
}
exports.default = (connection) => {
    return new MongoDBAdapter(connection);
};
