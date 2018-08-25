"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
let redis;
try {
    // tslint:disable-next-line:no-var-requires
    redis = require('redis');
}
catch (error) {
    console.log('Install redis module to use this adapter');
    process.exit(1);
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
    constructor(connection) {
        super();
        this.support_upsert = false;
        this.key_type = types.Integer;
        this._connection = connection;
    }
    drop(model) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.delete(model, []);
        });
    }
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
    create(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            data.$_$ = ''; // ensure that there is one argument(one field) at least
            let id;
            try {
                id = yield this._client.incrAsync(`${inflector_1.tableize(model)}:_lastid`);
            }
            catch (error) {
                throw RedisAdapter.wrapError('unknown error', error);
            }
            try {
                yield this._client.hmsetAsync(`${inflector_1.tableize(model)}:${id}`, data);
            }
            catch (error) {
                throw RedisAdapter.wrapError('unknown error', error);
            }
            return id;
        });
    }
    createBulk(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._createBulkDefault(model, data);
        });
    }
    update(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = `${inflector_1.tableize(model)}:${data.id}`;
            delete data.id;
            data.$_$ = ''; // ensure that there is one argument(one field) at least
            let exists;
            try {
                exists = (yield this._client.existsAsync(key));
            }
            catch (error) {
                throw RedisAdapter.wrapError('unknown error', error);
            }
            if (!exists) {
                return;
            }
            try {
                yield this._client.delAsync(key);
            }
            catch (error) {
                throw RedisAdapter.wrapError('unknown error', error);
            }
            try {
                yield this._client.hmsetAsync(key, data);
            }
            catch (error) {
                throw RedisAdapter.wrapError('unknown error', error);
            }
        });
    }
    updatePartial(model, data, conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const fields_to_del = Object.keys(data).filter((key) => data[key] == null);
            fields_to_del.forEach((key) => {
                return delete data[key];
            });
            fields_to_del.push('$_$'); // ensure that there is one argument at least
            const table = inflector_1.tableize(model);
            data.$_$ = ''; // ensure that there is one argument(one field) at least
            const keys = yield this._getKeys(table, conditions);
            for (const key of keys) {
                const args = _.clone(fields_to_del);
                args.unshift(key);
                try {
                    yield this._client.hdelAsync(args);
                }
                catch (error) {
                    throw RedisAdapter.wrapError('unknown error', error);
                }
                try {
                    yield this._client.hmsetAsync(key, data);
                }
                catch (error) {
                    throw RedisAdapter.wrapError('unknown error', error);
                }
            }
            return keys.length;
        });
    }
    findById(model, id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let result;
            try {
                result = (yield this._client.hgetallAsync(`${inflector_1.tableize(model)}:${id}`));
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
        });
    }
    find(model, conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const table = inflector_1.tableize(model);
            const keys = yield this._getKeys(table, conditions);
            let records = yield Promise.all(keys.map((key) => __awaiter(this, void 0, void 0, function* () {
                const result = yield this._client.hgetallAsync(key);
                if (result) {
                    result.id = Number(key.substr(table.length + 1));
                }
                return result;
            })));
            records = records.filter((record) => record != null);
            return records.map((record) => {
                return this._convertToModelInstance(model, record, options);
            });
        });
    }
    delete(model, conditions) {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = yield this._getKeys(inflector_1.tableize(model), conditions);
            if (keys.length === 0) {
                return 0;
            }
            let count;
            try {
                count = (yield this._client.delAsync(keys));
            }
            catch (error) {
                throw RedisAdapter.wrapError('unknown error', error);
            }
            return count;
        });
    }
    /**
     * Connects to the database
     */
    connect(settings) {
        return __awaiter(this, void 0, void 0, function* () {
            const methods = ['del', 'exists', 'hdel', 'hgetall', 'hmset', 'incr', 'keys', 'select'];
            this._client = redis.createClient(settings.port || 6379, settings.host || '127.0.0.1');
            for (const method of methods) {
                this._client[method + 'Async'] = util.promisify(this._client[method]);
            }
            return (yield this._client.selectAsync(settings.database || 0));
        });
    }
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
    _getKeys(table, conditions) {
        return __awaiter(this, void 0, void 0, function* () {
            if (Array.isArray(conditions)) {
                if (conditions.length === 0) {
                    return (yield this._client.keysAsync(`${table}:*`));
                }
                const all_keys = [];
                yield Promise.all(conditions.map((condition) => __awaiter(this, void 0, void 0, function* () {
                    const keys = yield this._getKeys(table, condition);
                    [].push.apply(all_keys, keys);
                })));
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
        });
    }
}
exports.default = (connection) => {
    return new RedisAdapter(connection);
};
