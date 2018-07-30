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
const inflector_1 = require("../util/inflector");
/**
 * Model cache
 * @namespace model
 */
class ModelCache {
    static _loadFromCache(key, refresh) {
        return __awaiter(this, void 0, void 0, function* () {
            var redis, value;
            if (refresh) {
                throw new Error('error');
            }
            redis = (yield this._connection._connectRedisCache());
            key = 'CC.' + inflector_1.tableize(this._name) + ':' + key;
            value = (yield new Promise(function (resolve, reject) {
                return redis.get(key, function (error, value) {
                    if (error) {
                        return reject(error);
                    }
                    return resolve(value);
                });
            }));
            if (value == null) {
                throw new Error('error');
            }
            return JSON.parse(value);
        });
    }
    static _saveToCache(key, ttl, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var redis;
            redis = (yield this._connection._connectRedisCache());
            key = 'CC.' + inflector_1.tableize(this._name) + ':' + key;
            return (yield new Promise(function (resolve, reject) {
                return redis.setex(key, ttl, JSON.stringify(data), function (error) {
                    if (error) {
                        return reject(error);
                    }
                    return resolve();
                });
            }));
        });
    }
    static removeCache(key) {
        return __awaiter(this, void 0, void 0, function* () {
            var redis;
            redis = (yield this._connection._connectRedisCache());
            key = 'CC.' + inflector_1.tableize(this._name) + ':' + key;
            return (yield new Promise(function (resolve, reject) {
                return redis.del(key, function (error, count) {
                    return resolve();
                });
            }));
        });
    }
}
exports.ModelCache = ModelCache;
