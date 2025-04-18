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
exports.BaseModel = void 0;
const util_1 = require("util");
const lodash_1 = __importDefault(require("lodash"));
const index_js_1 = require("../connection/index.js");
const query_js_1 = require("../query.js");
const types = __importStar(require("../types.js"));
const util = __importStar(require("../util/index.js"));
const inflector_js_1 = require("../util/inflector.js");
const inflector = __importStar(require("../util/inflector.js"));
function _pf_isDirty() {
    return true;
}
function _pf_getChanged() {
    return [];
}
function _pf_get(path) {
    return util.getPropertyOfPath(this, path.split('.'));
}
function _pf_getPrevious() {
    /**/
}
function _pf_set(path, value) {
    return util.setPropertyOfPath(this, path.split('.'), value);
}
function _pf_reset() {
    /**/
}
/**
 * Base class for models
 */
class BaseModel {
    /**
     * Tracks changes of a record if true
     */
    static { this.dirty_tracking = false; }
    /**
     * Archives deleted records in the archive table
     */
    static { this.archive = false; }
    /**
     * Applies the lean option for all queries for this Model
     */
    static { this.lean_query = false; }
    /**
     * Forces to return record id as string.
     * It remains as number on the persisted record if the adapter uses number for record id.
     */
    static { this.query_record_id_as_string = false; }
    static { this._initialize_called = false; }
    static initialize() {
        /**/
    }
    /**
     * Returns a new model class extending BaseModel
     */
    static newModel(connection, name, schema) {
        const NewModel = class extends BaseModel {
        };
        NewModel.connection(connection, name);
        for (const column_name in schema) {
            const property = schema[column_name];
            NewModel.column(column_name, property);
        }
        return NewModel;
    }
    /**
     * Sets a connection of this model
     *
     * If this methods was not called explicitly, this model will use Connection.defaultConnection
     */
    static connection(connection, name) {
        if (Object.prototype.hasOwnProperty.call(this, '_connection')) {
            throw new Error('Model::connection was called twice');
        }
        if (!name) {
            name = this.name;
        }
        connection.models[name] = this;
        connection[name] = this;
        Object.defineProperty(this, '_connection', { value: connection });
        Object.defineProperty(this, '_adapter', { value: connection._adapter });
        Object.defineProperty(this, '_associations', { value: {} });
        Object.defineProperty(this, '_validators', { value: [] });
        Object.defineProperty(this, '_name', { value: name });
        Object.defineProperty(this, '_schema', { value: {} });
        Object.defineProperty(this, '_intermediate_paths', { value: {} });
        Object.defineProperty(this, '_indexes', { value: [] });
        Object.defineProperty(this, '_integrities', { value: [] });
        if (!this.table_name) {
            this.table_name = (0, inflector_js_1.tableize)(name);
        }
        this.column('id', 'recordid');
    }
    static _checkConnection() {
        if (Object.prototype.hasOwnProperty.call(this, '_connection')) {
            return;
        }
        if (index_js_1.Connection.defaultConnection == null) {
            throw new Error('Create a Connection before creating a Model');
        }
        return this.connection(index_js_1.Connection.defaultConnection);
    }
    static async _checkReady() {
        this._checkConnection();
        await Promise.all([this._connection._checkSchemaApplied(), this._connection._promise_connection]);
    }
    static column(path, type_or_property) {
        this._checkConnection();
        // nested path
        if (lodash_1.default.isPlainObject(type_or_property) && (!type_or_property.type || type_or_property.type.type)) {
            for (const subcolumn in type_or_property) {
                const subproperty = type_or_property[subcolumn];
                this.column(path + '.' + subcolumn, subproperty);
            }
            return;
        }
        if (Object.prototype.hasOwnProperty.call(this._schema, path)) {
            // if using association, a column may be defined more than twice (by hasMany and belongsTo, for example)
            // overwrite some properties if given later
            const column = this._schema[path];
            if (column && type_or_property && type_or_property.required) {
                column.required = type_or_property.required;
            }
            return;
        }
        // convert simple type to property object
        if (!lodash_1.default.isPlainObject(type_or_property)) {
            type_or_property = { type: type_or_property };
        }
        if (Array.isArray(type_or_property.type)) {
            type_or_property.array = true;
            type_or_property.type = type_or_property.type[0];
        }
        const property = type_or_property;
        let type = types._toCORMOType(property.type);
        if (type.constructor === types.RecordID) {
            type = this._getKeyType(property.connection);
            property.record_id = true;
        }
        // check supports of GeoPoint
        if (type.constructor === types.GeoPoint && !this._adapter.support_geopoint) {
            throw new Error('this adapter does not support GeoPoint type');
        }
        if (type.constructor === types.String &&
            type.length &&
            !this._adapter.support_string_type_with_length) {
            throw new Error('this adapter does not support String type with length');
        }
        const parts = path.split('.');
        for (let i = 0; i < parts.length - 1; i++) {
            this._intermediate_paths[parts.slice(0, i + 1).join('.')] = 1;
        }
        property.type = type;
        property.type_class = type.constructor;
        property._parts = parts;
        property._parts_db = (property.name || path).split('.');
        property._dbname_dot = property.name || path;
        property._dbname_us = (property.name || path).replace(/\./g, '_');
        property.primary_key = path === 'id';
        this._schema[path] = property;
        if (property.unique) {
            this._indexes.push({
                columns: lodash_1.default.zipObject([property._dbname_us], [1]),
                options: {
                    name: property._dbname_us,
                    required: property.required,
                    unique: true,
                },
            });
        }
        this._connection._schema_changed = true;
    }
    /**
     * Adds an index to this model
     */
    static index(columns, options = {}) {
        this._checkConnection();
        this._indexes.push({ columns, options });
        this._connection._schema_changed = true;
    }
    /**
     * Drops this model from the database
     * @see AdapterBase::drop
     */
    static async drop() {
        try {
            // do not need to apply schema before drop, only waiting connection established
            await this._connection._promise_connection;
            await this._adapter.drop(this._name);
        }
        finally {
            this._connection._schema_changed = true;
        }
    }
    static build(data, options) {
        const model = new this(data);
        if (options?.use_id_in_data && data?.id) {
            Object.defineProperty(model, 'id', {
                configurable: true,
                enumerable: true,
                value: data.id,
                writable: false,
            });
        }
        return model;
    }
    /**
     * Deletes all records from the database
     */
    static async deleteAll() {
        await this.delete();
    }
    /**
     * Adds a has-many association
     */
    static hasMany(target_model_or_column, options) {
        this._checkConnection();
        this._connection.addAssociation({ type: 'hasMany', this_model: this, target_model_or_column, options });
    }
    /**
     * Adds a has-one association
     */
    static hasOne(target_model_or_column, options) {
        this._checkConnection();
        this._connection.addAssociation({ type: 'hasOne', this_model: this, target_model_or_column, options });
    }
    /**
     * Adds a belongs-to association
     */
    static belongsTo(target_model_or_column, options) {
        this._checkConnection();
        this._connection.addAssociation({ type: 'belongsTo', this_model: this, target_model_or_column, options });
    }
    static [util_1.inspect.custom](_depth) {
        const schema = Object.keys(this._schema)
            .sort()
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            .map((column) => `${column}: ${this._schema[column]?.type}`)
            .join(', ');
        return '\u001b[36m' + `[Model: ${this.name}(` + '\u001b[90m' + schema + '\u001b[36m' + ')]' + '\u001b[39m';
    }
    static _getKeyType(target_connection = this._connection) {
        if (this._connection === target_connection && target_connection._adapter.key_type_internal) {
            return new target_connection._adapter.key_type_internal();
        }
        else {
            return new target_connection._adapter.key_type();
        }
    }
    /**
     * Set nested object null if all children are null
     */
    static _collapseNestedNulls(instance, selected_columns_raw, intermediates) {
        for (const path of Object.keys(this._intermediate_paths)) {
            if (selected_columns_raw && selected_columns_raw.indexOf(path) === -1) {
                continue;
            }
            let obj;
            let last;
            if (intermediates) {
                obj = intermediates;
                last = path;
            }
            else {
                [obj, last] = util.getLeafOfPath(instance, path);
            }
            let has_non_null = false;
            for (const key in obj[last]) {
                const value = obj[last][key];
                if (value != null) {
                    has_non_null = true;
                }
            }
            if (!has_non_null) {
                obj[last] = null;
            }
        }
    }
    static async _loadFromCache(key, refresh) {
        if (refresh) {
            throw new Error('error');
        }
        const redis = await this._connection._connectRedisCache();
        key = 'CC.' + (0, inflector_js_1.tableize)(this._name) + ':' + key;
        const value = await new Promise((resolve, reject) => {
            redis.get(key, (error, v) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(v);
            });
        });
        if (value == null) {
            throw new Error('error');
        }
        return JSON.parse(value);
    }
    static async _saveToCache(key, ttl, data) {
        const redis = await this._connection._connectRedisCache();
        key = 'CC.' + (0, inflector_js_1.tableize)(this._name) + ':' + key;
        await new Promise((resolve, reject) => {
            redis.setex(key, ttl, JSON.stringify(data), (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }
    static async removeCache(key) {
        const redis = await this._connection._connectRedisCache();
        key = 'CC.' + (0, inflector_js_1.tableize)(this._name) + ':' + key;
        await new Promise((resolve) => {
            redis.del(key, () => {
                resolve();
            });
        });
    }
    /**
     * Adds a callback of after initializing
     */
    static afterInitialize(method) {
        this.addCallback('after', 'initialize', method);
    }
    /**
     * Adds a callback of after finding
     */
    static afterFind(method) {
        this.addCallback('after', 'find', method);
    }
    /**
     * Adds a callback of before saving
     */
    static beforeSave(method) {
        this.addCallback('before', 'save', method);
    }
    /**
     * Adds a callback of after saving
     */
    static afterSave(method) {
        this.addCallback('after', 'save', method);
    }
    /**
     * Adds a callback of before creating
     */
    static beforeCreate(method) {
        this.addCallback('before', 'create', method);
    }
    /**
     * Adds a callback of after creating
     */
    static afterCreate(method) {
        this.addCallback('after', 'create', method);
    }
    /**
     * Adds a callback of before updating
     */
    static beforeUpdate(method) {
        this.addCallback('before', 'update', method);
    }
    /**
     * Adds a callback of after updating
     */
    static afterUpdate(method) {
        this.addCallback('after', 'update', method);
    }
    /**
     * Adds a callback of before destroying
     */
    static beforeDestroy(method) {
        this.addCallback('before', 'destroy', method);
    }
    /**
     * Adds a callback of after destroying
     */
    static afterDestroy(method) {
        this.addCallback('after', 'destroy', method);
    }
    /**
     * Adds a callback of before validating
     */
    static beforeValidate(method) {
        this.addCallback('before', 'validate', method);
    }
    /**
     * Adds a callback of after validating
     */
    static afterValidate(method) {
        this.addCallback('after', 'validate', method);
    }
    static async create(data, options) {
        await this._checkReady();
        return await this.build(data, options).save(options);
    }
    static async createBulk(data, options) {
        await this._checkReady();
        if (!Array.isArray(data)) {
            throw new Error('data is not an array');
        }
        if (data.length === 0) {
            return [];
        }
        const records = data.map((item) => {
            return this.build(item, options);
        });
        records.forEach((record) => this.applyDefaultValues(record));
        await Promise.all(records.map((record) => record.validate()));
        for (const record of records) {
            record._runCallbacks('save', 'before');
        }
        for (const record of records) {
            record._runCallbacks('create', 'before');
        }
        try {
            return await this._createBulk(records, options);
        }
        finally {
            for (const record of records) {
                record._runCallbacks('create', 'after');
            }
            for (const record of records) {
                record._runCallbacks('save', 'after');
            }
        }
    }
    /**
     * Creates q query object
     */
    static query(options) {
        return new query_js_1.Query(this).transaction(options && options.transaction);
    }
    static find(id, options) {
        return this.query(options).find(id);
    }
    /**
     * Finds records by ids while preserving order.
     * @throws {Error('not found')}
     */
    static findPreserve(ids, options) {
        return this.query(options).findPreserve(ids);
    }
    /**
     * Finds records by conditions
     */
    static where(condition, options) {
        return this.query(options).where(condition);
    }
    static select(columns, options) {
        return this.query(options).select(columns);
    }
    /**
     * Specifies orders of result
     */
    static order(orders, options) {
        return this.query(options).order(orders);
    }
    static group(group_by, fields, options) {
        return this.query(options).group(group_by, fields);
    }
    /**
     * Counts records by conditions
     */
    static async count(condition, options) {
        return await this.query(options).where(condition).count();
    }
    /**
     * Updates some fields of records that match conditions
     */
    static async update(updates, condition, options) {
        return await this.query(options).where(condition).update(updates);
    }
    /**
     * Deletes records by conditions
     */
    static async delete(condition, options) {
        return await this.query(options).where(condition).delete();
    }
    /**
     * Adds 'created_at' and 'updated_at' fields to records
     */
    static timestamps() {
        this.column('created_at', Date);
        this.column('updated_at', Date);
        this.beforeCreate(function () {
            const d = new Date();
            this.created_at = this.updated_at = d;
        });
        this.beforeUpdate(function () {
            const d = new Date();
            this.updated_at = d;
        });
    }
    /**
     * Adds a validator
     * A validator must return false(boolean) or error message(string), or throw an Error exception if invalid
     */
    static addValidator(validator) {
        this._checkConnection();
        this._validators.push(validator);
    }
    static _buildSaveDataColumn(data, model, column, property, allow_null = false) {
        const adapter = this._adapter;
        let value = util.getPropertyOfPath(model, property._parts);
        value = adapter.valueToDB(value, column, property);
        if (allow_null || value !== undefined) {
            if (adapter.support_nested) {
                util.setPropertyOfPath(data, property._parts_db, value);
            }
            else {
                data[property._dbname_us] = value;
            }
        }
    }
    static _validateColumn(data, column, property, for_update = false) {
        let obj;
        let last;
        // eslint-disable-next-line prefer-const
        [obj, last] = util.getLeafOfPath(data, property._parts, false);
        const value = obj && obj[last];
        if (value != null) {
            if (property.array) {
                if (!Array.isArray(value)) {
                    throw new Error(`'${column}' is not an array`);
                }
                try {
                    for (let i = 0; i < value.length; i++) {
                        if (value[i] != null) {
                            value[i] = this._validateType(column, property.type_class, value[i]);
                        }
                    }
                }
                catch {
                    // TODO: detail message like 'array of types'
                    throw new Error(`'${column}' is not an array`);
                }
            }
            else {
                if (value.$inc != null) {
                    if (for_update) {
                        if (property.type_class === types.Number ||
                            property.type_class === types.Integer ||
                            property.type_class === types.BigInteger) {
                            obj[last] = { $inc: this._validateType(column, property.type_class, value.$inc) };
                        }
                        else {
                            throw new Error(`'${column}' is not a number type`);
                        }
                    }
                    else {
                        throw new Error('$inc is allowed only for update method');
                    }
                }
                else {
                    obj[last] = this._validateType(column, property.type_class, value);
                }
            }
        }
        else {
            if (property.required) {
                throw new Error(`'${column}' is required`);
            }
        }
    }
    /** @internal */
    static _completeSchema() {
        for (const index of this._indexes) {
            if (!index.options.name) {
                const column_names = Object.keys(index.columns).map((column_name) => {
                    return this._schema[column_name]?._dbname_us || column_name;
                });
                index.options.name = column_names.join('_');
            }
        }
    }
    /**
     * Adds a callback
     */
    static addCallback(type, name, method) {
        this._checkConnection();
        const callbacks_map = this._callbacks_map || (this._callbacks_map = {});
        const callbacks = callbacks_map[name] || (callbacks_map[name] = []);
        return callbacks.push({ type, method });
    }
    static async _createBulk(records, options = {}) {
        let error;
        const data_array = records.map((record) => {
            try {
                return record._buildSaveData();
            }
            catch (e) {
                error = e;
            }
        });
        if (error) {
            throw error;
        }
        this._connection.log(this._name, 'createBulk', data_array);
        const ids = await this._adapter.createBulk(this._name, data_array, {
            transaction: options.transaction,
            use_id_in_data: options.use_id_in_data,
        });
        records.forEach((record, i) => {
            Object.defineProperty(record, 'id', {
                configurable: false,
                enumerable: true,
                value: this.query_record_id_as_string ? String(ids[i]) : ids[i],
                writable: false,
            });
            if (this.query_record_id_as_string) {
                for (const column of Object.keys(this._schema)) {
                    const property = this._schema[column];
                    if (property && property.record_id && !property.primary_key) {
                        const value = record[column];
                        if (value) {
                            if (property.array) {
                                record[column] = value.map((item) => (item ? String(item) : null));
                            }
                            else {
                                record[column] = String(value);
                            }
                        }
                    }
                }
            }
        });
        return records;
    }
    static _validateType(column, type_class, value) {
        switch (type_class) {
            case types.Number:
                value = Number(value);
                if (isNaN(value)) {
                    throw new Error(`'${column}' is not a number`);
                }
                break;
            case types.Boolean:
                if (typeof value !== 'boolean') {
                    throw new Error(`'${column}' is not a boolean`);
                }
                break;
            case types.Integer:
                value = Number(value);
                // value>>0 checkes integer and 32bit
                if (isNaN(value) || value >> 0 !== value) {
                    throw new Error(`'${column}' is not an integer`);
                }
                break;
            case types.BigInteger:
                value = Number(value);
                if (isNaN(value) || !Number.isSafeInteger(value)) {
                    throw new Error(`'${column}' is not a big integer`);
                }
                break;
            case types.GeoPoint:
                if (!(Array.isArray(value) && value.length === 2)) {
                    throw new Error(`'${column}' is not a geo point`);
                }
                else {
                    value[0] = Number(value[0]);
                    value[1] = Number(value[1]);
                }
                break;
            case types.Date:
                value = new Date(value);
                if (isNaN(value.getTime())) {
                    throw new Error(`'${column}' is not a date`);
                }
        }
        return value;
    }
    /**
     * Creates a record
     */
    constructor(data) {
        data = data || {};
        const ctor = this.constructor;
        const schema = ctor._schema;
        const adapter = ctor._adapter;
        Object.defineProperty(this, '_prev_attributes', { writable: true, value: {} });
        if (ctor.dirty_tracking) {
            Object.defineProperty(this, '_attributes', { value: {} });
            Object.defineProperty(this, '_intermediates', { value: {} });
            for (const path of Object.keys(ctor._intermediate_paths).sort()) {
                const [obj, last] = util.getLeafOfPath(this, path);
                this._intermediates[path] = {};
                this._defineProperty(obj, last, path, false);
            }
            for (const column in schema) {
                const property = schema[column];
                if (!property || property.primary_key) {
                    continue;
                }
                const [obj, last] = util.getLeafOfPath(this, property._parts);
                this._defineProperty(obj, last, column, false);
            }
        }
        else {
            Object.defineProperty(this, 'isDirty', { value: _pf_isDirty });
            Object.defineProperty(this, 'getChanged', { value: _pf_getChanged });
            Object.defineProperty(this, 'get', { value: _pf_get });
            Object.defineProperty(this, 'getPrevious', { value: _pf_getPrevious });
            Object.defineProperty(this, 'set', { value: _pf_set });
            Object.defineProperty(this, 'reset', { value: _pf_reset });
        }
        if (ctor._object_column_classes) {
            for (const { column, klass } of ctor._object_column_classes) {
                this[column] = new klass();
            }
        }
        if (arguments.length === 4) {
            // if this has 4 arguments, this is called from adapter with database record data
            // eslint-disable-next-line prefer-rest-params
            const [id, selected_columns, selected_columns_raw] = [arguments[1], arguments[2], arguments[3]];
            adapter.setValuesFromDB(this, data, schema, selected_columns, ctor.query_record_id_as_string);
            ctor._collapseNestedNulls(this, selected_columns_raw, ctor.dirty_tracking ? this._intermediates : undefined);
            Object.defineProperty(this, 'id', {
                configurable: false,
                enumerable: true,
                value: id,
                writable: false,
            });
            Object.defineProperty(this, '_is_persisted', {
                configurable: false,
                enumerable: false,
                value: true,
                writable: false,
            });
            this._runCallbacks('find', 'after');
        }
        else {
            for (const column in schema) {
                const property = schema[column];
                if (!property || property.primary_key) {
                    continue;
                }
                const parts = property._parts;
                let value = util.getPropertyOfPath(data, parts);
                if (value === undefined) {
                    value = null;
                }
                util.setPropertyOfPath(this, parts, value);
            }
            ctor._collapseNestedNulls(this, null, ctor.dirty_tracking ? this._intermediates : undefined);
            Object.defineProperty(this, 'id', {
                configurable: true,
                enumerable: true,
                value: null,
                writable: false,
            });
        }
        this._runCallbacks('initialize', 'after');
    }
    /**
     * Returns true if there is some changed columns
     */
    isDirty() {
        return Object.keys(this._prev_attributes).length > 0;
    }
    /**
     * Returns the list of paths of changed columns
     */
    getChanged() {
        return Object.keys(this._prev_attributes);
    }
    /**
     * Returns the current value of the column of the given path
     */
    get(path) {
        if (Object.prototype.hasOwnProperty.call(this._intermediates, path)) {
            return this._intermediates[path];
        }
        else {
            return util.getPropertyOfPath(this._attributes, path);
        }
    }
    /**
     * Returns the original value of the column of the given path
     */
    getPrevious(path) {
        return this._prev_attributes[path];
    }
    /**
     * Changes the value of the column of the given path
     */
    set(path, value) {
        if (Object.prototype.hasOwnProperty.call(this._intermediates, path)) {
            const obj = this._intermediates[path];
            for (const k in obj) {
                obj[k] = undefined;
            }
            for (const k in value) {
                obj[k] = value[k];
            }
        }
        else {
            const parts = path.split('.');
            const prev_value = util.getPropertyOfPath(this._attributes, parts);
            if (prev_value === value) {
                return;
            }
            if (!Object.prototype.hasOwnProperty.call(this._prev_attributes, path)) {
                this._prev_attributes[path] = prev_value;
            }
            let [obj, last] = util.getLeafOfPath(this, parts);
            this._defineProperty(obj, last, path, true);
            util.setPropertyOfPath(this._attributes, parts, value);
            while (parts.length > 1) {
                parts.pop();
                [obj, last] = util.getLeafOfPath(this, parts);
                this._defineProperty(obj, last, parts.join('.'), true);
            }
        }
    }
    /**
     * Resets all changes
     */
    reset() {
        for (const path in this._prev_attributes) {
            const value = this._prev_attributes[path];
            this.set(path, value);
        }
        this._prev_attributes = {};
    }
    /**
     * Destroys this record (remove from the database)
     */
    async destroy() {
        this._runCallbacks('destroy', 'before');
        try {
            if (this.id) {
                const ctor = this.constructor;
                await ctor.delete({ id: this.id });
            }
        }
        finally {
            this._runCallbacks('destroy', 'after');
        }
    }
    _defineProperty(object, key, path, enumerable) {
        Object.defineProperty(object, key, {
            configurable: true,
            enumerable,
            get: () => {
                return this.get(path);
            },
            set: (value) => {
                this.set(path, value);
            },
        });
    }
    /**
     * Saves data to the database
     */
    async save(options = {}) {
        const ctor = this.constructor;
        await ctor._checkReady();
        if (!this._is_persisted) {
            ctor.applyDefaultValues(this);
        }
        if (options.validate !== false) {
            this.validate();
            return await this.save({ ...options, validate: false });
        }
        this._runCallbacks('save', 'before');
        if (this._is_persisted) {
            this._runCallbacks('update', 'before');
            try {
                await this._update(options);
            }
            finally {
                this._runCallbacks('update', 'after');
                this._runCallbacks('save', 'after');
            }
        }
        else {
            this._runCallbacks('create', 'before');
            try {
                await this._create(options);
            }
            finally {
                this._runCallbacks('create', 'after');
                this._runCallbacks('save', 'after');
            }
        }
        return this;
    }
    /**
     * Validates data
     */
    validate() {
        this._runCallbacks('validate', 'before');
        const errors = [];
        const ctor = this.constructor;
        const schema = ctor._schema;
        for (const column in schema) {
            const property = schema[column];
            if (!property || property.primary_key) {
                continue;
            }
            try {
                ctor._validateColumn(this, column, property);
            }
            catch (error) {
                errors.push(error.message);
            }
        }
        ctor._validators.forEach((validator) => {
            try {
                const r = validator(this);
                if (r === false) {
                    errors.push('validation failed');
                }
                else if (typeof r === 'string') {
                    errors.push(r);
                }
            }
            catch (e) {
                errors.push(e.message);
            }
        });
        if (errors.length > 0) {
            this._runCallbacks('validate', 'after');
            throw new Error(errors.join(','));
        }
        else {
            this._runCallbacks('validate', 'after');
        }
    }
    _runCallbacks(name, type) {
        const ctor = this.constructor;
        let callbacks = ctor._callbacks_map && ctor._callbacks_map[name];
        if (!callbacks) {
            return;
        }
        callbacks = callbacks.filter((callback) => callback.type === type);
        for (const callback of callbacks) {
            let method = callback.method;
            if (typeof method === 'string') {
                if (!this[method]) {
                    throw new Error(`The method '${method}' doesn't exist`);
                }
                method = this[method];
            }
            if (typeof method !== 'function') {
                throw new Error('Cannot execute method');
            }
            method.call(this);
        }
    }
    _buildSaveData() {
        const data = {};
        const ctor = this.constructor;
        const schema = ctor._schema;
        for (const column in schema) {
            const property = schema[column];
            if (!property || property.primary_key) {
                continue;
            }
            ctor._buildSaveDataColumn(data, this, column, property);
        }
        if (this.id != null) {
            data.id = ctor._adapter.idToDB(this.id);
        }
        return data;
    }
    async _create(options) {
        const data = this._buildSaveData();
        const ctor = this.constructor;
        if (!options.skip_log) {
            ctor._connection.log(ctor._name, 'create', data);
        }
        const id = await ctor._adapter.create(ctor._name, data, {
            transaction: options.transaction || this._transaction,
            use_id_in_data: options.use_id_in_data,
        });
        Object.defineProperty(this, 'id', {
            configurable: false,
            enumerable: true,
            value: ctor.query_record_id_as_string ? String(id) : id,
            writable: false,
        });
        if (ctor.query_record_id_as_string) {
            for (const column of Object.keys(ctor._schema)) {
                const property = ctor._schema[column];
                if (property && property.record_id && !property.primary_key) {
                    const value = this.get(column);
                    if (value) {
                        if (property.array) {
                            this.set(column, value.map((item) => (item ? String(item) : null)));
                        }
                        else {
                            this.set(column, String(value));
                        }
                    }
                }
            }
        }
        Object.defineProperty(this, '_is_persisted', {
            configurable: false,
            enumerable: false,
            value: true,
            writable: false,
        });
        // save sub objects of each association
        const foreign_key = inflector.foreign_key(ctor._name);
        const promises = Object.keys(ctor._associations).map(async (column) => {
            const sub_promises = (this['__cache_' + column] || []).map((sub) => {
                sub[foreign_key] = id;
                return sub.save();
            });
            return await Promise.all(sub_promises);
        });
        try {
            await Promise.all(promises);
        }
        catch {
            //
        }
        return (this._prev_attributes = {});
    }
    async _update(options) {
        const ctor = this.constructor;
        if (ctor.dirty_tracking) {
            // update changed values only
            if (!this.isDirty()) {
                return;
            }
            const data = {};
            const adapter = ctor._adapter;
            const schema = ctor._schema;
            for (const path in this._prev_attributes) {
                const property = schema[path];
                if (property) {
                    ctor._buildSaveDataColumn(data, this._attributes, path, property, true);
                }
            }
            if (!options.skip_log) {
                ctor._connection.log(ctor._name, 'update', data);
            }
            await adapter.updatePartial(ctor._name, data, [{ id: this.id }], {});
            return (this._prev_attributes = {});
        }
        else {
            // update all
            const data = this._buildSaveData();
            if (!options.skip_log) {
                ctor._connection.log(ctor._name, 'update', data);
            }
            await ctor._adapter.update(ctor._name, data, { transaction: options.transaction || this._transaction });
            return (this._prev_attributes = {});
        }
    }
    static applyDefaultValues(obj) {
        const applied_columns = [];
        for (const column in this._schema) {
            const property = this._schema[column];
            if (!property || property.primary_key || property.default_value == null) {
                continue;
            }
            const value = util.getPropertyOfPath(obj, property._parts);
            if (value == null) {
                const default_value = lodash_1.default.isFunction(property.default_value) ? property.default_value() : property.default_value;
                util.setPropertyOfPath(obj, property._parts, default_value);
                this._validateColumn(obj, column, property);
                applied_columns.push(property._dbname_dot);
            }
        }
        return applied_columns;
    }
}
exports.BaseModel = BaseModel;
