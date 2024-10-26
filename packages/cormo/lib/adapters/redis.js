"use strict";
/* eslint-disable @typescript-eslint/no-unused-vars */
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
exports.RedisAdapter = void 0;
exports.createAdapter = createAdapter;
let redis;
try {
    redis = require('ioredis');
}
catch (error) {
    //
}
const lodash_1 = __importDefault(require("lodash"));
const types = __importStar(require("../types"));
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
    async drop(model_name) {
        await this.delete(model_name, [], { orders: [] });
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
    async create(model_name, data, options) {
        data.$_$ = ''; // ensure that there is one argument(one field) at least
        let id;
        try {
            if (options.use_id_in_data) {
                id = data.id;
            }
            else {
                id = await this._client.incr(`${(0, inflector_1.tableize)(model_name)}:_lastid`);
            }
        }
        catch (error) {
            throw RedisAdapter.wrapError('unknown error', error);
        }
        try {
            await this._client.hmset(`${(0, inflector_1.tableize)(model_name)}:${id}`, data);
        }
        catch (error) {
            throw RedisAdapter.wrapError('unknown error', error);
        }
        return id;
    }
    /** @internal */
    async createBulk(model_name, data, options) {
        return await this._createBulkDefault(model_name, data, options);
    }
    /** @internal */
    async update(model_name, data, options) {
        const key = `${(0, inflector_1.tableize)(model_name)}:${data.id}`;
        delete data.id;
        data.$_$ = ''; // ensure that there is one argument(one field) at least
        let exists;
        try {
            exists = await this._client.exists(key);
        }
        catch (error) {
            throw RedisAdapter.wrapError('unknown error', error);
        }
        if (!exists) {
            return;
        }
        try {
            await this._client.del(key);
        }
        catch (error) {
            throw RedisAdapter.wrapError('unknown error', error);
        }
        try {
            await this._client.hmset(key, data);
        }
        catch (error) {
            throw RedisAdapter.wrapError('unknown error', error);
        }
    }
    /** @internal */
    async updatePartial(model_name, data, conditions, options) {
        const fields_to_del = Object.keys(data).filter((key) => data[key] == null);
        fields_to_del.forEach((key) => {
            return delete data[key];
        });
        fields_to_del.push('$_$'); // ensure that there is one argument at least
        const table = (0, inflector_1.tableize)(model_name);
        data.$_$ = ''; // ensure that there is one argument(one field) at least
        const keys = await this._getKeys(table, conditions);
        for (const key of keys) {
            const args = lodash_1.default.clone(fields_to_del);
            args.unshift(key);
            try {
                await this._client.hdel(args);
            }
            catch (error) {
                throw RedisAdapter.wrapError('unknown error', error);
            }
            try {
                await this._client.hmset(key, data);
            }
            catch (error) {
                throw RedisAdapter.wrapError('unknown error', error);
            }
        }
        return keys.length;
    }
    /** @internal */
    async upsert(model_name, data, conditions, options) {
        return Promise.reject(new Error('not implemented'));
    }
    /** @internal */
    async findById(model_name, id, options) {
        let result;
        try {
            const key = `${(0, inflector_1.tableize)(model_name)}:${id}`;
            if (await this._client.exists(key)) {
                result = await this._client.hgetall(key);
            }
        }
        catch (error) {
            throw RedisAdapter.wrapError('unknown error', error);
        }
        if (result) {
            result.id = id;
            return this._convertToModelInstance(model_name, result, options);
        }
        else {
            throw new Error('not found');
        }
    }
    /** @internal */
    async find(model_name, conditions, options) {
        const table = (0, inflector_1.tableize)(model_name);
        const keys = await this._getKeys(table, conditions);
        let records = await Promise.all(keys.map(async (key) => {
            const result = (await this._client.exists(key)) ? await this._client.hgetall(key) : undefined;
            if (result) {
                result.id = Number(key.substr(table.length + 1));
            }
            return result;
        }));
        records = records.filter((record) => record != null);
        return records.map((record) => {
            return this._convertToModelInstance(model_name, record, options);
        });
    }
    /** @internal */
    stream(model_name, conditions, options) {
        throw new Error('not implemented');
    }
    /** @internal */
    async count(model_name, conditions, options) {
        return Promise.reject(new Error('not implemented'));
    }
    /** @internal */
    async delete(model_name, conditions, options) {
        const keys = await this._getKeys((0, inflector_1.tableize)(model_name), conditions);
        if (keys.length === 0) {
            return 0;
        }
        let count;
        try {
            count = await this._client.del(keys);
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
        return await this._client.select(settings.database || 0);
    }
    /** @internal */
    valueToModel(value, property, query_record_id_as_string) {
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
                if (property.record_id && query_record_id_as_string) {
                    return String(value);
                }
                return value;
        }
    }
    /** @internal */
    async _getKeys(table, conditions) {
        if (Array.isArray(conditions)) {
            if (conditions.length === 0) {
                return await this._client.keys(`${table}:*`);
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
function createAdapter(connection) {
    if (!redis) {
        console.log('Install redis module to use this adapter');
        process.exit(1);
    }
    return new RedisAdapter(connection);
}
