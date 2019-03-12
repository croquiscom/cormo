"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let redis;
try {
    // tslint:disable-next-line:no-var-requires
    redis = require('redis');
}
catch (error) {
    //
}
const _ = require("lodash");
const util = require("util");
const types = require("../types");
const inflector_1 = require("../util/inflector");
const base_1 = require("./base");
// Adapter for Redis
// @namespace adapter
class RedisAdapter extends base_1.AdapterBase {
    // Creates a Redis adapter
    /** @internal */
    constructor(connection) {
        super();
        /** @internal */
        this.support_upsert = false;
        /** @internal */
        this.key_type = types.Integer;
        this._connection = connection;
    }
    /** @internal */
    async drop(model) {
        await this.delete(model, [], {});
    }
    /** @internal */
    valueToDB(value, column, property) {
        if (value == null) {
            return;
        }
        switch (property.type_class) {
            case types.Number:
            case types.Integer:
                return value.toString();
            case types.Date:
                return new Date(value).getTime().toString();
            case types.Boolean:
                if (value) {
                    return '1';
                }
                else {
                    return '0';
                }
                break;
            case types.Object:
                return JSON.stringify(value);
            default:
                return value;
        }
    }
    /** @internal */
    async create(model, data, options) {
        data.$_$ = ''; // ensure that there is one argument(one field) at least
        let id;
        try {
            id = await this._client.incrAsync(`${inflector_1.tableize(model)}:_lastid`);
        }
        catch (error) {
            throw RedisAdapter.wrapError('unknown error', error);
        }
        try {
            await this._client.hmsetAsync(`${inflector_1.tableize(model)}:${id}`, data);
        }
        catch (error) {
            throw RedisAdapter.wrapError('unknown error', error);
        }
        return id;
    }
    /** @internal */
    async createBulk(model, data, options) {
        return await this._createBulkDefault(model, data, options);
    }
    /** @internal */
    async update(model, data, options) {
        const key = `${inflector_1.tableize(model)}:${data.id}`;
        delete data.id;
        data.$_$ = ''; // ensure that there is one argument(one field) at least
        let exists;
        try {
            exists = (await this._client.existsAsync(key));
        }
        catch (error) {
            throw RedisAdapter.wrapError('unknown error', error);
        }
        if (!exists) {
            return;
        }
        try {
            await this._client.delAsync(key);
        }
        catch (error) {
            throw RedisAdapter.wrapError('unknown error', error);
        }
        try {
            await this._client.hmsetAsync(key, data);
        }
        catch (error) {
            throw RedisAdapter.wrapError('unknown error', error);
        }
    }
    /** @internal */
    async updatePartial(model, data, conditions, options) {
        const fields_to_del = Object.keys(data).filter((key) => data[key] == null);
        fields_to_del.forEach((key) => {
            return delete data[key];
        });
        fields_to_del.push('$_$'); // ensure that there is one argument at least
        const table = inflector_1.tableize(model);
        data.$_$ = ''; // ensure that there is one argument(one field) at least
        const keys = await this._getKeys(table, conditions);
        for (const key of keys) {
            const args = _.clone(fields_to_del);
            args.unshift(key);
            try {
                await this._client.hdelAsync(args);
            }
            catch (error) {
                throw RedisAdapter.wrapError('unknown error', error);
            }
            try {
                await this._client.hmsetAsync(key, data);
            }
            catch (error) {
                throw RedisAdapter.wrapError('unknown error', error);
            }
        }
        return keys.length;
    }
    /** @internal */
    async upsert(model, data, conditions, options) {
        throw new Error('not implemented');
    }
    /** @internal */
    async findById(model, id, options) {
        let result;
        try {
            result = (await this._client.hgetallAsync(`${inflector_1.tableize(model)}:${id}`));
        }
        catch (error) {
            throw RedisAdapter.wrapError('unknown error', error);
        }
        if (result) {
            result.id = id;
            return this._convertToModelInstance(model, result, options);
        }
        else {
            throw new Error('not found');
        }
    }
    /** @internal */
    async find(model, conditions, options) {
        const table = inflector_1.tableize(model);
        const keys = await this._getKeys(table, conditions);
        let records = await Promise.all(keys.map(async (key) => {
            const result = await this._client.hgetallAsync(key);
            if (result) {
                result.id = Number(key.substr(table.length + 1));
            }
            return result;
        }));
        records = records.filter((record) => record != null);
        return records.map((record) => {
            return this._convertToModelInstance(model, record, options);
        });
    }
    /** @internal */
    stream(model, conditions, options) {
        throw new Error('not implemented');
    }
    /** @internal */
    async count(model, conditions, options) {
        throw new Error('not implemented');
    }
    /** @internal */
    async delete(model, conditions, options) {
        const keys = await this._getKeys(inflector_1.tableize(model), conditions);
        if (keys.length === 0) {
            return 0;
        }
        let count;
        try {
            count = (await this._client.delAsync(keys));
        }
        catch (error) {
            throw RedisAdapter.wrapError('unknown error', error);
        }
        return count;
    }
    /** @internal */
    close() {
        //
    }
    /**
     * Connects to the database
     * @internal
     */
    async connect(settings) {
        const methods = ['del', 'exists', 'hdel', 'hgetall', 'hmset', 'incr', 'keys', 'select'];
        this._client = redis.createClient(settings.port || 6379, settings.host || '127.0.0.1');
        for (const method of methods) {
            this._client[method + 'Async'] = util.promisify(this._client[method]);
        }
        return (await this._client.selectAsync(settings.database || 0));
    }
    /** @internal */
    valueToModel(value, property) {
        switch (property.type_class) {
            case types.Number:
            case types.Integer:
                return Number(value);
            case types.Date:
                return new Date(Number(value));
            case types.Boolean:
                return value !== '0';
            case types.Object:
                return JSON.parse(value);
            default:
                return value;
        }
    }
    /** @internal */
    async _getKeys(table, conditions) {
        if (Array.isArray(conditions)) {
            if (conditions.length === 0) {
                return (await this._client.keysAsync(`${table}:*`));
            }
            const all_keys = [];
            await Promise.all(conditions.map(async (condition) => {
                const keys = await this._getKeys(table, condition);
                [].push.apply(all_keys, keys);
            }));
            return all_keys;
        }
        else if (typeof conditions === 'object' && conditions.id) {
            if (conditions.id.$in) {
                return conditions.id.$in.map((id) => `${table}:${id}`);
            }
            else {
                return [`${table}:${conditions.id}`];
            }
        }
        return [];
    }
}
exports.RedisAdapter = RedisAdapter;
exports.default = (connection) => {
    if (!redis) {
        console.log('Install redis module to use this adapter');
        process.exit(1);
    }
    return new RedisAdapter(connection);
};
