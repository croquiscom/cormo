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
const connection_1 = require("../connection");
const query_1 = require("../query");
const types = require("../types");
const util = require("../util");
const inflector_1 = require("../util/inflector");
const inflector = require("../util/inflector");
function _pf_isDirty() {
    return true;
}
function _pf_getChanged() {
    return [];
}
function _pf_get(path) {
    return util.getPropertyOfPath(this, path.split('.'));
}
function _pf_getPrevious() { }
function _pf_set(path, value) {
    return util.setPropertyOfPath(this, path.split('.'), value);
}
function _pf_reset() { }
/**
 * Base class for models
 */
class Model {
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
            // tslint:disable-next-line:forin
            for (const column in schema) {
                const property = schema[column];
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
        const id = arguments[1];
        if (id) {
            // if id exists, this is called from adapter with database record data
            const selected_columns = arguments[2];
            const selected_columns_raw = arguments[3];
            adapter.setValuesFromDB(this, data, schema, selected_columns);
            ctor._collapseNestedNulls(this, selected_columns_raw, ctor.dirty_tracking ? this._intermediates : void 0);
            Object.defineProperty(this, 'id', {
                configurable: false,
                enumerable: true,
                value: id,
                writable: false,
            });
            this._runCallbacks('find', 'after');
        }
        else {
            // tslint:disable-next-line:forin
            for (const column in schema) {
                const property = schema[column];
                const parts = property._parts;
                let value = util.getPropertyOfPath(data, parts);
                if (value === undefined) {
                    value = null;
                }
                util.setPropertyOfPath(this, parts, value);
            }
            ctor._collapseNestedNulls(this, null, ctor.dirty_tracking ? this._intermediates : void 0);
            Object.defineProperty(this, 'id', {
                configurable: true,
                enumerable: true,
                value: null,
                writable: false,
            });
        }
        this._runCallbacks('initialize', 'after');
    }
    static initialize() { }
    /**
     * Returns a new model class extending Model
     */
    static newModel(connection, name, schema) {
        // tslint:disable-next-line:variable-name max-classes-per-file
        const NewModel = class extends Model {
        };
        NewModel.connection(connection, name);
        // tslint:disable-next-line:forin
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
        if (this.hasOwnProperty('_connection')) {
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
        if (!this.tableName) {
            this.tableName = inflector_1.tableize(name);
        }
    }
    static _checkConnection() {
        if (this.hasOwnProperty('_connection')) {
            return;
        }
        if (connection_1.Connection.defaultConnection == null) {
            throw new Error('Create a Connection before creating a Model');
        }
        return this.connection(connection_1.Connection.defaultConnection);
    }
    static _checkReady() {
        return __awaiter(this, void 0, void 0, function* () {
            this._checkConnection();
            yield Promise.all([this._connection._checkSchemaApplied(), this._connection._promise_connection]);
        });
    }
    /**
     * Adds a column to this model
     */
    static column(path, property) {
        this._checkConnection();
        // nested path
        if (_.isPlainObject(property) && (!property.type || property.type.type)) {
            // tslint:disable-next-line:forin
            for (const subcolumn in property) {
                const subproperty = property[subcolumn];
                this.column(path + '.' + subcolumn, subproperty);
            }
            return;
        }
        if (this._schema.hasOwnProperty(path)) {
            // if using association, a column may be defined more than twice (by hasMany and belongsTo, for example)
            // overwrite some properties if given later
            if ((property != null ? property.required : void 0) != null) {
                this._schema[path].required = property.required;
            }
            return;
        }
        // convert simple type to property object
        if (!_.isPlainObject(property)) {
            property = { type: property };
        }
        if (Array.isArray(property.type)) {
            property.array = true;
            property.type = property.type[0];
        }
        let type = types._toCORMOType(property.type);
        if (type.constructor === types.RecordID) {
            type = this._getKeyType(property.connection);
            property.record_id = true;
        }
        // check supports of GeoPoint
        if (type.constructor === types.GeoPoint && !this._adapter.support_geopoint) {
            throw new Error('this adapter does not support GeoPoint type');
        }
        if (type.constructor === types.String && type.length && !this._adapter.support_string_type_with_length) {
            throw new Error('this adapter does not support String type with length');
        }
        const parts = path.split('.');
        for (let i = 0; i < parts.length - 1; i++) {
            this._intermediate_paths[parts.slice(0, i + 1).join('.')] = 1;
        }
        property.type = type;
        property.type_class = type.constructor;
        property._parts = path.split('.');
        property._dbname = path.replace(/\./g, '_');
        this._schema[path] = property;
        if (property.unique) {
            this._indexes.push({
                columns: _.zipObject([property._dbname], [1]),
                options: {
                    name: property._dbname,
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
        if (!options.name) {
            options.name = Object.keys(columns).join('_');
        }
        this._indexes.push({ columns, options });
        this._connection._schema_changed = true;
    }
    /**
     * Drops this model from the database
     * @see AdapterBase::drop
     */
    static drop() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // do not need to apply schema before drop, only waiting connection established
                yield this._connection._promise_connection;
                yield this._adapter.drop(this._name);
            }
            finally {
                this._connection._schema_changed = true;
            }
        });
    }
    /**
     * Creates a record.
     * 'Model.build(data)' is the same as 'new Model(data)'
     */
    static build(data) {
        return new this(data);
    }
    /**
     * Deletes all records from the database
     */
    static deleteAll() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.delete();
        });
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
    static inspect(depth) {
        const schema = Object.keys(this._schema || {}).sort()
            .map((column) => `${column}: ${this._schema[column].type}`)
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
            // tslint:disable-next-line:forin
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
    static _loadFromCache(key, refresh) {
        return __awaiter(this, void 0, void 0, function* () {
            if (refresh) {
                throw new Error('error');
            }
            const redis = yield this._connection._connectRedisCache();
            key = 'CC.' + inflector_1.tableize(this._name) + ':' + key;
            const value = yield new Promise((resolve, reject) => {
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
        });
    }
    static _saveToCache(key, ttl, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const redis = yield this._connection._connectRedisCache();
            key = 'CC.' + inflector_1.tableize(this._name) + ':' + key;
            yield new Promise((resolve, reject) => {
                redis.setex(key, ttl, JSON.stringify(data), (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                });
            });
        });
    }
    static removeCache(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const redis = yield this._connection._connectRedisCache();
            key = 'CC.' + inflector_1.tableize(this._name) + ':' + key;
            yield new Promise((resolve) => {
                redis.del(key, () => {
                    resolve();
                });
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
    /**
     * Creates a record and saves it to the database
     * 'Model.create(data)' is the same as 'Model.build(data).save()'
     */
    static create(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._checkReady();
            return yield this.build(data).save(options);
        });
    }
    /**
     * Creates multiple records and saves them to the database.
     */
    static createBulk(data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._checkReady();
            if (!Array.isArray(data)) {
                throw new Error('data is not an array');
            }
            if (data.length === 0) {
                return [];
            }
            const records = data.map((item) => {
                return this.build(item);
            });
            yield Promise.all(records.map((record) => record.validate()));
            for (const record of records) {
                record._runCallbacks('save', 'before');
            }
            for (const record of records) {
                record._runCallbacks('create', 'before');
            }
            try {
                return yield this._createBulk(records);
            }
            finally {
                for (const record of records) {
                    record._runCallbacks('create', 'after');
                }
                for (const record of records) {
                    record._runCallbacks('save', 'after');
                }
            }
        });
    }
    /**
     * Creates q query object
     */
    static query() {
        return new query_1.Query(this);
    }
    static find(id) {
        return this.query().find(id);
    }
    /**
     * Finds records by ids while preserving order.
     * @throws {Error('not found')}
     */
    static findPreserve(ids) {
        return this.query().findPreserve(ids);
    }
    /**
     * Finds records by conditions
     */
    static where(condition) {
        return this.query().where(condition);
    }
    /**
     * Selects columns for result
     */
    static select(columns) {
        return this.query().select(columns);
    }
    /**
     * Specifies orders of result
     */
    static order(orders) {
        return this.query().order(orders);
    }
    /**
     * Groups result records
     */
    static group(group_by, fields) {
        return this.query().group(group_by, fields);
    }
    /**
     * Counts records by conditions
     */
    static count(condition) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.query().where(condition).count();
        });
    }
    /**
     * Updates some fields of records that match conditions
     */
    static update(updates, condition) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.query().where(condition).update(updates);
        });
    }
    /**
     * Deletes records by conditions
     */
    static delete(condition) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.query().where(condition).delete();
        });
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
    /**
     * Adds a callback
     */
    static addCallback(type, name, method) {
        this._checkConnection();
        if (!(type === 'before' || type === 'after') || !name) {
            return;
        }
        const callbacks_map = this._callbacks_map || (this._callbacks_map = {});
        const callbacks = callbacks_map[name] || (callbacks_map[name] = []);
        return callbacks.push({ type, method });
    }
    static _buildSaveDataColumn(data, model, column, property, allow_null) {
        const adapter = this._adapter;
        const parts = property._parts;
        let value = util.getPropertyOfPath(model, parts);
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
    static _createBulk(records) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const ids = yield this._adapter.createBulk(this._name, data_array);
            records.forEach((record, i) => {
                Object.defineProperty(record, 'id', {
                    configurable: false,
                    enumerable: true,
                    value: ids[i],
                    writable: false,
                });
            });
            return records;
        });
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
                // tslint:disable-next-line:no-bitwise
                if (isNaN(value) || (value >> 0) !== value) {
                    throw new Error(`'${column}' is not an integer`);
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
    static _validateColumn(data, column, property, for_update) {
        let obj;
        let last;
        [obj, last] = util.getLeafOfPath(data, property._parts, false);
        const value = obj && obj[last];
        if (value != null) {
            if (property.array) {
                if (!Array.isArray(value)) {
                    throw new Error(`'${column}' is not an array`);
                }
                try {
                    for (let i = 0; i < value.length; i++) {
                        value[i] = this._validateType(column, property.type_class, value[i]);
                    }
                }
                catch (error) {
                    // TODO: detail message like 'array of types'
                    throw new Error(`'${column}' is not an array`);
                }
            }
            else {
                if (value.$inc != null) {
                    if (for_update) {
                        if (property.type_class === types.Number || property.type_class === types.Integer) {
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
        if (this._intermediates.hasOwnProperty(path)) {
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
        if (this._intermediates.hasOwnProperty(path)) {
            const obj = this._intermediates[path];
            // tslint:disable-next-line:forin
            for (const k in obj) {
                obj[k] = undefined;
            }
            // tslint:disable-next-line:forin
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
            if (!this._prev_attributes.hasOwnProperty(path)) {
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
        // tslint:disable-next-line:forin
        for (const path in this._prev_attributes) {
            const value = this._prev_attributes[path];
            this.set(path, value);
        }
        this._prev_attributes = {};
    }
    /**
     * Destroys this record (remove from the database)
     */
    destroy() {
        return __awaiter(this, void 0, void 0, function* () {
            this._runCallbacks('destroy', 'before');
            try {
                if (this.id) {
                    yield this.constructor.delete({ id: this.id });
                }
            }
            finally {
                this._runCallbacks('destroy', 'after');
            }
        });
    }
    _defineProperty(object, key, path, enumerable) {
        Object.defineProperty(object, key, {
            configurable: true,
            enumerable,
            get: () => {
                return this.get(path);
            },
            set: (value) => {
                return this.set(path, value);
            },
        });
    }
    /**
     * Saves data to the database
     */
    save(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.constructor._checkReady();
            if (options.validate !== false) {
                yield this.validate();
                return yield this.save(Object.assign({}, options, { validate: false }));
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
    /**
     * Validates data
     */
    validate() {
        this._runCallbacks('validate', 'before');
        const errors = [];
        const ctor = this.constructor;
        const schema = ctor._schema;
        // tslint:disable-next-line:forin
        for (const column in schema) {
            const property = schema[column];
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
        let callbacks = this.constructor._callbacks_map && this.constructor._callbacks_map[name];
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
        // tslint:disable-next-line:forin
        for (const column in schema) {
            const property = schema[column];
            ctor._buildSaveDataColumn(data, this, column, property);
        }
        if (this.id != null) {
            data.id = ctor._adapter.idToDB(this.id);
        }
        return data;
    }
    _create(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = this._buildSaveData();
            const ctor = this.constructor;
            if (!(options && options.skip_log)) {
                ctor._connection.log(ctor._name, 'create', data);
            }
            const id = yield ctor._adapter.create(ctor._name, data);
            Object.defineProperty(this, 'id', {
                configurable: false,
                enumerable: true,
                value: id,
                writable: false,
            });
            // save sub objects of each association
            const foreign_key = inflector.foreign_key(ctor._name);
            const promises = Object.keys(ctor._associations).map((column) => __awaiter(this, void 0, void 0, function* () {
                const sub_promises = (this['__cache_' + column] || []).map((sub) => {
                    sub[foreign_key] = id;
                    return sub.save();
                });
                return (yield Promise.all(sub_promises));
            }));
            try {
                yield Promise.all(promises);
            }
            catch (error) {
                //
            }
            return this._prev_attributes = {};
        });
    }
    _update(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const ctor = this.constructor;
            if (ctor.dirty_tracking) {
                // update changed values only
                if (!this.isDirty()) {
                    return;
                }
                const data = {};
                const adapter = ctor._adapter;
                const schema = ctor._schema;
                // tslint:disable-next-line:forin
                for (const path in this._prev_attributes) {
                    ctor._buildSaveDataColumn(data, this._attributes, path, schema[path], true);
                }
                if (!(options != null ? options.skip_log : void 0)) {
                    ctor._connection.log(ctor._name, 'update', data);
                }
                yield adapter.updatePartial(ctor._name, data, { id: this.id }, {});
                return this._prev_attributes = {};
            }
            else {
                // update all
                const data = this._buildSaveData();
                if (!(options != null ? options.skip_log : void 0)) {
                    ctor._connection.log(ctor._name, 'update', data);
                }
                yield ctor._adapter.update(ctor._name, data);
                return this._prev_attributes = {};
            }
        });
    }
}
/**
 * Tracks changes of a record if true
 */
Model.dirty_tracking = false;
/**
 * Archives deleted records in the archive table
 */
Model.archive = false;
/**
 * Applies the lean option for all queries for this Model
 */
Model.lean_query = false;
Model._initialize_called = false;
exports.Model = Model;
