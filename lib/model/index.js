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
const types = require("../types");
const util = require("../util");
const inflector_1 = require("../util/inflector");
const cache_1 = require("./cache");
const callback_1 = require("./callback");
const persistence_1 = require("./persistence");
const query_1 = require("./query");
const timestamp_1 = require("./timestamp");
const validate_1 = require("./validate");
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
 * @uses ModelCache
 * @uses ModelCallback
 * @uses ModelPersistence
 * @uses ModelQuery
 * @uses ModelTimestamp
 * @uses ModelValidate
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
        Object.defineProperty(this, '_prev_attributes', {
            writable: true,
            value: {},
        });
        if (ctor.dirty_tracking) {
            Object.defineProperty(this, '_attributes', {
                value: {},
            });
            Object.defineProperty(this, '_intermediates', {
                value: {},
            });
            for (const path of Object.keys(ctor._intermediate_paths).sort()) {
                const [obj, last] = util.getLeafOfPath(this, path);
                this._intermediates[path] = {};
                this._defineProperty(obj, last, path, false);
            }
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
                writable: false,
                value: id,
            });
            this._runCallbacks('find', 'after');
        }
        else {
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
                writable: false,
                value: null,
            });
        }
        this._runCallbacks('initialize', 'after');
    }
    // ModelCache static interface
    static _loadFromCache(key, refresh) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    static _saveToCache(key, ttl, data) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    static removeCache(key) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    // ModelCallback static interface
    static afterInitialize(method) { }
    static afterFind(method) { }
    static beforeSave(method) { }
    static afterSave(method) { }
    static beforeCreate(method) { }
    static afterCreate(method) { }
    static beforeUpdate(method) { }
    static afterUpdate(method) { }
    static beforeDestroy(method) { }
    static afterDestroy(method) { }
    static beforeValidate(method) { }
    static afterValidate(method) { }
    // ModelPersistence static interface
    static create(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return {};
        });
    }
    static createBulk(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return [];
        });
    }
    // ModelQuery static interface
    static query() {
        return {};
    }
    static find(id) {
        return {};
    }
    static findPreserve(ids) {
        return {};
    }
    static where(condition) {
        return {};
    }
    static select(columns) {
        return {};
    }
    static order(orders) {
        return {};
    }
    static _createQueryAndRun(criteria, data) {
        return {};
    }
    static _createOptionalQueryAndRun(criteria, data) {
        return {};
    }
    //#
    // Schema for this model.
    // Maps from column path to property object
    // @property _schema
    // @type StringMap<Object>
    // @private
    // @static
    // @see Model.connection
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
            return (yield Promise.all([this._connection._checkSchemaApplied(), this._connection._promise_connection]));
        });
    }
    //#
    // Adds a column to this model
    // @param {String} path
    // @param {Function|String|ColumnProperty} property
    static column(path, property) {
        var i, j, parts, ref, subcolumn, subproperty, type;
        this._checkConnection();
        // nested path
        if (_.isPlainObject(property) && (!property.type || property.type.type)) {
            for (subcolumn in property) {
                subproperty = property[subcolumn];
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
            property = {
                type: property
            };
        }
        if (Array.isArray(property.type)) {
            property.array = true;
            property.type = property.type[0];
        }
        type = types._toCORMOType(property.type);
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
        parts = path.split('.');
        for (i = j = 0, ref = parts.length - 1; (0 <= ref ? j < ref : j > ref); i = 0 <= ref ? ++j : --j) {
            this._intermediate_paths[parts.slice(0, +i + 1 || 9e9).join('.')] = 1;
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
                    unique: true,
                    required: property.required
                }
            });
        }
        return this._connection._schema_changed = true;
    }
    //#
    // Adds an index to this model
    // @param {Object} columns hash of <column, order>
    // @param {Object} [options]
    // @param {Boolean} [options.unique]
    static index(columns, options) {
        this._checkConnection();
        options || (options = {});
        if (!options.name) {
            options.name = Object.keys(columns).join('_');
        }
        this._indexes.push({
            columns: columns,
            options: options
        });
        return this._connection._schema_changed = true;
    }
    //#
    // Drops this model from the database
    // @promise
    // @see AdapterBase::drop
    static drop() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // do not need to apply schema before drop, only waiting connection established
                yield this._connection._promise_connection;
                return (yield this._adapter.drop(this._name));
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
            return (yield this.delete());
        });
    }
    /**
     * Adds a has-many association
     * @param {Class<Model>|String} target_model_or_column
     * @param {Object} [options]
     * @param {String} [options.type]
     * @param {String} [options.as]
     * @param {String} [options.foreign_key]
     * @param {String} [options.integrity='ignore'] 'ignore', 'nullify', 'restrict', or 'delete'
     */
    static hasMany(target_model_or_column, options) {
        this._checkConnection();
        this._connection.addAssociation({
            type: 'hasMany',
            this_model: this,
            target_model_or_column: target_model_or_column,
            options: options
        });
    }
    /**
     * Adds a has-one association
     * @param {Class<Model>|String} target_model_or_column
     * @param {Object} [options]
     * @param {String} [options.type]
     * @param {String} [options.as]
     * @param {String} [options.foreign_key]
     * @param {String} [options.integrity='ignore'] 'ignore', 'nullify', 'restrict', or 'delete'
     */
    static hasOne(target_model_or_column, options) {
        this._checkConnection();
        this._connection.addAssociation({
            type: 'hasOne',
            this_model: this,
            target_model_or_column: target_model_or_column,
            options: options
        });
    }
    /**
     * Adds a belongs-to association
     * @param {Class<Model>|String} target_model_or_column
     * @param {Object} [options]
     * @param {String} [options.type]
     * @param {String} [options.as]
     * @param {String} [options.foreign_key]
     * @param {Boolean} [options.required]
     */
    static belongsTo(target_model_or_column, options) {
        this._checkConnection();
        this._connection.addAssociation({
            type: 'belongsTo',
            this_model: this,
            target_model_or_column: target_model_or_column,
            options: options
        });
    }
    static inspect(depth) {
        var schema;
        schema = Object.keys(this._schema || {}).sort().map((column) => {
            return `${column}: ${this._schema[column].type}`;
        }).join(', ');
        return '\u001b[36m' + `[Model: ${this.name}(` + '\u001b[90m' + schema + '\u001b[36m' + ")]" + '\u001b[39m';
    }
    static _getKeyType(target_connection = this._connection) {
        if (this._connection === target_connection && target_connection._adapter.key_type_internal) {
            return new target_connection._adapter.key_type_internal;
        }
        else {
            return new target_connection._adapter.key_type;
        }
    }
    /**
     * Set nested object null if all children are null
     */
    static _collapseNestedNulls(instance, selected_columns_raw, intermediates) {
        var has_non_null, j, key, last, len, obj, path, ref, ref1, results, value;
        ref = Object.keys(this._intermediate_paths);
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
            path = ref[j];
            if (selected_columns_raw && selected_columns_raw.indexOf(path) === -1) {
                continue;
            }
            if (intermediates) {
                obj = intermediates;
                last = path;
            }
            else {
                [obj, last] = util.getLeafOfPath(instance, path);
            }
            has_non_null = false;
            ref1 = obj[last];
            for (key in ref1) {
                value = ref1[key];
                if (value != null) {
                    has_non_null = true;
                }
            }
            if (!has_non_null) {
                results.push(obj[last] = null);
            }
            else {
                results.push(void 0);
            }
        }
        return results;
    }
    // ModelCallback interface
    _runCallbacks(name, type) { }
    // ModelPersistence interface
    save(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return this;
        });
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
     * @param {String} path
     * @return {*}
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
     * @param {String} path
     * @return {*}
     */
    getPrevious(path) {
        return this._prev_attributes[path];
    }
    /**
     * Changes the value of the column of the given path
     * @param {String} path
     * @param {*} value
     * @return {*}
     */
    set(path, value) {
        var k, last, obj, parts, prev_value, results, results1, v;
        if (this._intermediates.hasOwnProperty(path)) {
            obj = this._intermediates[path];
            for (k in obj) {
                obj[k] = void 0;
            }
            results = [];
            for (k in value) {
                v = value[k];
                results.push(obj[k] = v);
            }
            return results;
        }
        else {
            parts = path.split('.');
            prev_value = util.getPropertyOfPath(this._attributes, parts);
            if (prev_value === value) {
                return;
            }
            if (!this._prev_attributes.hasOwnProperty(path)) {
                this._prev_attributes[path] = prev_value;
            }
            [obj, last] = util.getLeafOfPath(this, parts);
            this._defineProperty(obj, last, path, true);
            util.setPropertyOfPath(this._attributes, parts, value);
            results1 = [];
            while (parts.length > 1) {
                parts.pop();
                [obj, last] = util.getLeafOfPath(this, parts);
                results1.push(this._defineProperty(obj, last, parts.join('.'), true));
            }
            return results1;
        }
    }
    /**
     * Resets all changes
     */
    reset() {
        var path, ref, value;
        ref = this._prev_attributes;
        for (path in ref) {
            value = ref[path];
            this.set(path, value);
        }
        return this._prev_attributes = {};
    }
    /**
     * Destroys this record (remove from the database)
     */
    destroy() {
        return __awaiter(this, void 0, void 0, function* () {
            this._runCallbacks('destroy', 'before');
            try {
                if (this.id) {
                    return (yield this.constructor.delete({
                        id: this.id
                    }));
                }
            }
            finally {
                this._runCallbacks('destroy', 'after');
            }
        });
    }
    //#
    // @property _prev_attributes
    // @private
    //#
    // @property _attributes
    // @private
    //#
    // @property _intermediates
    // @private
    _defineProperty(object, key, path, enumerable) {
        return Object.defineProperty(object, key, {
            configurable: true,
            enumerable: enumerable,
            get: () => {
                return this.get(path);
            },
            set: (value) => {
                return this.set(path, value);
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
exports.Model = Model;
function applyMixins(derivedCtor, baseCtors) {
    for (const baseCtor of baseCtors) {
        for (const name of Object.getOwnPropertyNames(baseCtor)) {
            if (name === 'length' || name === 'prototype' || name === 'name') {
                continue;
            }
            derivedCtor[name] = baseCtor[name];
        }
        for (const name of Object.getOwnPropertyNames(baseCtor.prototype)) {
            derivedCtor.prototype[name] = baseCtor.prototype[name];
        }
    }
}
applyMixins(Model, [cache_1.ModelCache, callback_1.ModelCallback, persistence_1.ModelPersistence, query_1.ModelQuery, timestamp_1.ModelTimestamp, validate_1.ModelValidate]);
