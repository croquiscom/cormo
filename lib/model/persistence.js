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
const _ = require("lodash");
const inflector = require("../util/inflector");
const util = require("../util");
/**
 * Model persistence
 * @namespace model
 */
class ModelPersistence {
    //#
    // Creates a record and saves it to the database
    // 'Model.create(data)' is the same as 'Model.build(data).save()'
    // @param {Object} [data={}]
    // @param {Object} [options]
    // @param {Boolean} [options.skip_log=false]
    // @return {Model} created record
    // @promise
    static create(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._checkReady();
            return (yield this.build(data).save(options));
        });
    }
    //#
    // Creates multiple records and saves them to the database.
    // @param {Array<Object>} data
    // @return {Array<Model>} created records
    // @promise
    static createBulk(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var promises, records;
            yield this._checkReady();
            if (!Array.isArray(data)) {
                throw new Error('data is not an array');
            }
            if (data.length === 0) {
                return [];
            }
            records = data.map((item) => {
                return this.build(item);
            });
            promises = records.map(function (record) {
                return record.validate();
            });
            yield Promise.all(promises);
            records.forEach(function (record) {
                return record._runCallbacks('save', 'before');
            });
            records.forEach(function (record) {
                return record._runCallbacks('create', 'before');
            });
            try {
                return (yield this._createBulk(records));
            }
            finally {
                records.forEach(function (record) {
                    return record._runCallbacks('create', 'after');
                });
                records.forEach(function (record) {
                    return record._runCallbacks('save', 'after');
                });
            }
        });
    }
    static _buildSaveDataColumn(data, model, column, property, allow_null) {
        var adapter, parts, value;
        adapter = this._adapter;
        parts = property._parts;
        value = util.getPropertyOfPath(model, parts);
        value = adapter.valueToDB(value, column, property);
        if (allow_null || value !== void 0) {
            if (adapter.support_nested) {
                util.setPropertyOfPath(data, parts, value);
            }
            else {
                data[property._dbname] = value;
            }
        }
    }
    _buildSaveData() {
        var column, ctor, data, property, schema;
        data = {};
        ctor = this.constructor;
        schema = ctor._schema;
        for (column in schema) {
            property = schema[column];
            ctor._buildSaveDataColumn(data, this, column, property);
        }
        if (this.id != null) {
            data.id = ctor._adapter.idToDB(this.id);
        }
        return data;
    }
    _create(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var ctor, data, foreign_key, id, promises;
            data = this._buildSaveData();
            ctor = this.constructor;
            if (!(options != null ? options.skip_log : void 0)) {
                ctor._connection.log(ctor._name, 'create', data);
            }
            id = (yield ctor._adapter.create(ctor._name, data));
            Object.defineProperty(this, 'id', {
                configurable: false,
                enumerable: true,
                writable: false,
                value: id
            });
            // save sub objects of each association
            foreign_key = inflector.foreign_key(ctor._name);
            promises = Object.keys(ctor._associations).map((column) => __awaiter(this, void 0, void 0, function* () {
                var sub_promises;
                sub_promises = (this['__cache_' + column] || []).map(function (sub) {
                    sub[foreign_key] = id;
                    return sub.save();
                });
                return (yield Promise.all(sub_promises));
            }));
            try {
                yield Promise.all(promises);
            }
            catch (error1) {
            }
            return this._prev_attributes = {};
        });
    }
    static _createBulk(records) {
        return __awaiter(this, void 0, void 0, function* () {
            var data_array, error, ids;
            error = void 0;
            data_array = records.map(function (record) {
                var data, e;
                try {
                    data = record._buildSaveData();
                }
                catch (error1) {
                    e = error1;
                    error = e;
                }
                return data;
            });
            if (error) {
                throw error;
            }
            this._connection.log(this._name, 'createBulk', data_array);
            ids = (yield this._adapter.createBulk(this._name, data_array));
            records.forEach(function (record, i) {
                return Object.defineProperty(record, 'id', {
                    configurable: false,
                    enumerable: true,
                    writable: false,
                    value: ids[i]
                });
            });
            return records;
        });
    }
    _update(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var adapter, ctor, data, path, schema;
            ctor = this.constructor;
            if (ctor.dirty_tracking) {
                // update changed values only
                if (!this.isDirty()) {
                    return;
                }
                data = {};
                adapter = ctor._adapter;
                schema = ctor._schema;
                for (path in this._prev_attributes) {
                    ctor._buildSaveDataColumn(data, this._attributes, path, schema[path], true);
                }
                if (!(options != null ? options.skip_log : void 0)) {
                    ctor._connection.log(ctor._name, 'update', data);
                }
                yield adapter.updatePartial(ctor._name, data, {
                    id: this.id
                }, {});
                return this._prev_attributes = {};
            }
            else {
                // update all
                data = this._buildSaveData();
                if (!(options != null ? options.skip_log : void 0)) {
                    ctor._connection.log(ctor._name, 'update', data);
                }
                yield ctor._adapter.update(ctor._name, data);
                return this._prev_attributes = {};
            }
        });
    }
    //#
    // Saves data to the database
    // @param {Object} [options]
    // @param {Boolean} [options.validate=true]
    // @param {Boolean} [options.skip_log=false]
    // @return {Model} this
    // @promise
    save(options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.constructor._checkReady();
            if ((options != null ? options.validate : void 0) !== false) {
                yield this.validate();
                return (yield this.save(_.extend({}, options, {
                    validate: false
                })));
            }
            this._runCallbacks('save', 'before');
            if (this.id) {
                this._runCallbacks('update', 'before');
                try {
                    yield this._update(options);
                }
                finally {
                    this._runCallbacks('update', 'after');
                    this._runCallbacks('save', 'after');
                }
            }
            else {
                this._runCallbacks('create', 'before');
                try {
                    yield this._create(options);
                }
                finally {
                    this._runCallbacks('create', 'after');
                    this._runCallbacks('save', 'after');
                }
            }
            return this;
        });
    }
}
exports.ModelPersistence = ModelPersistence;
