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
const stream = require("stream");
/**
 * Collects conditions to query
 */
class Query {
    /**
     * Creates a query instance
     */
    constructor(model) {
        this._model = model;
        this._name = model._name;
        this._connection = model._connection;
        this._adapter = model._connection._adapter;
        this._ifs = [];
        this._current_if = true;
        this._conditions = [];
        this._includes = [];
        this._options = {
            conditions_of_group: [],
            lean: model.lean_query,
            orders: [],
        };
    }
    /**
     * Finds a record by id
     * @chainable
     */
    find(id) {
        if (!this._current_if) {
            return this;
        }
        if (Array.isArray(id)) {
            this._id = _.uniq(id);
            this._find_single_id = false;
        }
        else {
            this._id = id;
            this._find_single_id = true;
        }
        return this;
    }
    /**
     * Finds records by ids while preserving order.
     * @chainable
     */
    findPreserve(ids) {
        if (!this._current_if) {
            return this;
        }
        this._id = _.uniq(ids);
        this._find_single_id = false;
        this._preserve_order_ids = ids;
        return this;
    }
    /**
     * Finds records near target
     * @chainable
     */
    near(target) {
        if (!this._current_if) {
            return this;
        }
        this._options.near = target;
        return this;
    }
    /**
     * Finds records by condition
     * @chainable
     */
    where(condition) {
        if (!this._current_if) {
            return this;
        }
        if (Array.isArray(condition)) {
            condition.forEach((cond) => {
                return this._addCondition(cond);
            });
        }
        else if (condition != null) {
            this._addCondition(condition);
        }
        return this;
    }
    /**
     * Selects columns for result
     * @chainable
     */
    select(columns) {
        var intermediate_paths, schema_columns, select, select_raw;
        if (!this._current_if) {
            return this;
        }
        this._options.select = null;
        this._options.select_raw = null;
        if (typeof columns === 'string') {
            schema_columns = Object.keys(this._model._schema);
            intermediate_paths = this._model._intermediate_paths;
            select = [];
            select_raw = [];
            columns.split(/\s+/).forEach(function (column) {
                if (schema_columns.indexOf(column) >= 0) {
                    select.push(column);
                    return select_raw.push(column);
                }
                else if (intermediate_paths[column]) {
                    // select all nested columns
                    select_raw.push(column);
                    column += '.';
                    return schema_columns.forEach(function (sc) {
                        if (sc.indexOf(column) === 0) {
                            return select.push(sc);
                        }
                    });
                }
            });
            this._options.select = select;
            this._options.select_raw = select_raw;
        }
        return this;
    }
    /**
     * Specifies orders of result
     * @chainable
     */
    order(orders) {
        var avaliable_columns;
        if (!this._current_if) {
            return this;
        }
        if (typeof orders === 'string') {
            avaliable_columns = ['id'];
            [].push.apply(avaliable_columns, Object.keys(this._model._schema));
            if (this._options.group_fields) {
                [].push.apply(avaliable_columns, Object.keys(this._options.group_fields));
            }
            orders.split(/\s+/).forEach((order) => {
                var asc;
                asc = true;
                if (order[0] === '-') {
                    asc = false;
                    order = order.slice(1);
                }
                if (avaliable_columns.indexOf(order) >= 0) {
                    return this._options.orders.push(asc ? order : '-' + order);
                }
            });
        }
        return this;
    }
    /**
     * Groups result records
     * @chainable
     */
    group(group_by, fields) {
        var columns, schema_columns;
        if (!this._current_if) {
            return this;
        }
        this._options.group_by = null;
        schema_columns = Object.keys(this._model._schema);
        if (typeof group_by === 'string') {
            columns = group_by.split(/\s+/).filter(function (column) {
                return schema_columns.indexOf(column) >= 0;
            });
            this._options.group_by = columns;
        }
        this._options.group_fields = fields;
        return this;
    }
    /**
     * Returns only one record (or null if does not exists).
     *
     * This is different from limit(1). limit(1) returns array of length 1 while this returns an instance.
     * @chainable
     */
    one() {
        if (!this._current_if) {
            return this;
        }
        this._options.limit = 1;
        this._options.one = true;
        return this;
    }
    /**
     * Sets limit of query
     * @chainable
     */
    limit(limit) {
        if (!this._current_if) {
            return this;
        }
        this._options.limit = limit;
        return this;
    }
    /**
     * Sets skip of query
     * @chainable
     */
    skip(skip) {
        if (!this._current_if) {
            return this;
        }
        this._options.skip = skip;
        return this;
    }
    /**
     * Returns raw instances instead of model instances
     * @chainable
     * @see Query::exec
     */
    lean(lean = true) {
        if (!this._current_if) {
            return this;
        }
        this._options.lean = lean;
        return this;
    }
    /**
     * Makes a part of the query chain conditional
     * @chainable
     * @see Query::endif
     */
    if(condition) {
        this._ifs.push(condition);
        this._current_if && (this._current_if = condition);
        return this;
    }
    /**
     * Ends last if
     * @chainable
     * @see Query::if
     */
    endif() {
        var condition, i, len, ref;
        this._ifs.pop();
        this._current_if = true;
        ref = this._ifs;
        for (i = 0, len = ref.length; i < len; i++) {
            condition = ref[i];
            this._current_if && (this._current_if = condition);
        }
        return this;
    }
    /**
     * Cache result.
     *
     * If cache of key exists, actual query does not performed.
     * If cache does not exist, query result will be saved in cache.
     *
     * Redis is used to cache.
     * @param {Object} options
     * @param {String} options.key
     * @param {Number} options.ttl TTL in seconds
     * @param {Boolean} options.refresh don't load from cache if true
     * @chainable
     */
    cache(options) {
        if (!this._current_if) {
            return this;
        }
        this._options.cache = options;
        return this;
    }
    /**
     * Returns associated objects also
     * @param {String} column
     * @param {String} [select]
     * @chainable
     */
    include(column, select) {
        if (!this._current_if) {
            return this;
        }
        this._includes.push({
            column: column,
            select: select
        });
        return this;
    }
    /**
     * Executes the query
     * @param {Object} [options]
     * @param {Boolean} [options.skip_log=false]
     * @return {Model|Array<Model>}
     * @promise
     * @see AdapterBase::findById
     * @see AdapterBase::find
     */
    exec(options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._model._checkReady();
            if (this._options.cache && this._options.cache.key) {
                try {
                    // try cache
                    return yield this._model._loadFromCache(this._options.cache.key, this._options.cache.refresh);
                }
                catch (error) {
                    // no cache, execute query
                    const records = (yield this._execAndInclude(options));
                    // save result to cache
                    yield this._model._saveToCache(this._options.cache.key, this._options.cache.ttl, records);
                    return records;
                }
            }
            else {
                return yield this._execAndInclude(options);
            }
        });
    }
    /**
     * Executes the query and returns a readable stream
     * @param {Object} [options]
     * @param {Boolean} [options.skip_log=false]
     * @return {Readable}
     * @see AdapterBase::findById
     * @see AdapterBase::find
     */
    stream() {
        var transformer;
        transformer = new stream.Transform({
            objectMode: true
        });
        transformer._transform = function (chunk, encoding, callback) {
            this.push(chunk);
            return callback();
        };
        this._model._checkReady().then(() => {
            return this._adapter.stream(this._name, this._conditions, this._options).on('error', function (error) {
                return transformer.emit('error', error);
            }).pipe(transformer);
        });
        return transformer;
    }
    /**
     * Explains the query
     * @return {Object}
     * @promise
     */
    explain() {
        return __awaiter(this, void 0, void 0, function* () {
            this._options.cache = null;
            this._options.explain = true;
            this._includes = [];
            return (yield this.exec({
                skip_log: true
            }));
        });
    }
    /**
     * Executes the query as a promise (.then == .exec().then)
     * @param {Function} fulfilled
     * @param {Function} rejected
     * @promise
     */
    then(fulfilled, rejected) {
        return this.exec().then(fulfilled, rejected);
    }
    /**
     * Executes the query as a count operation
     * @return {Number}
     * @promise
     * @see AdapterBase::count
     */
    count() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._model._checkReady();
            if (this._id || this._find_single_id) {
                this._conditions.push({
                    id: this._id
                });
                delete this._id;
            }
            return (yield this._adapter.count(this._name, this._conditions, this._options));
        });
    }
    /**
     * Executes the query as a update operation
     * @param {Object} updates
     * @return {Number}
     * @promise
     * @see AdapterBase::count
     */
    update(updates) {
        return __awaiter(this, void 0, void 0, function* () {
            var data, errors;
            yield this._model._checkReady();
            errors = [];
            data = {};
            this._validateAndBuildSaveData(errors, data, updates, '', updates);
            if (errors.length > 0) {
                throw new Error(errors.join(','));
            }
            if (this._id || this._find_single_id) {
                this._conditions.push({
                    id: this._id
                });
                delete this._id;
            }
            this._connection.log(this._name, 'update', {
                data: data,
                conditions: this._conditions,
                options: this._options
            });
            return (yield this._adapter.updatePartial(this._name, data, this._conditions, this._options));
        });
    }
    /**
     * Executes the query as an insert or update operation
     * @param {Object} updates
     * @return {Number}
     * @promise
     * @see AdapterBase::count
     */
    upsert(updates) {
        return __awaiter(this, void 0, void 0, function* () {
            var data, errors;
            yield this._model._checkReady();
            errors = [];
            data = {};
            this._validateAndBuildSaveData(errors, data, updates, '', updates);
            if (errors.length > 0) {
                throw new Error(errors.join(','));
            }
            if (this._id || this._find_single_id) {
                this._conditions.push({
                    id: this._id
                });
                delete this._id;
            }
            this._connection.log(this._name, 'upsert', {
                data: data,
                conditions: this._conditions,
                options: this._options
            });
            return (yield this._adapter.upsert(this._name, data, this._conditions, this._options));
        });
    }
    /**
     * Executes the query as a delete operation
     * @param {Object} [options]
     * @param {Boolean} [options.skip_log=false]
     * @return {Number}
     * @promise
     * @see AdapterBase::delete
     */
    delete(options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._model._checkReady();
            if (this._id || this._find_single_id) {
                this._conditions.push({
                    id: this._id
                });
                delete this._id;
            }
            if (!(options != null ? options.skip_log : void 0)) {
                this._connection.log(this._name, 'delete', {
                    conditions: this._conditions
                });
            }
            yield this._doArchiveAndIntegrity(options);
            return (yield this._adapter.delete(this._name, this._conditions));
        });
    }
    _exec(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var error, expected_count, record, records;
            if (this._find_single_id && this._conditions.length === 0) {
                if (!(options != null ? options.skip_log : void 0)) {
                    this._connection.log(this._name, 'find by id', {
                        id: this._id,
                        options: this._options
                    });
                }
                if (!this._id) {
                    throw new Error('not found');
                }
                try {
                    record = (yield this._adapter.findById(this._name, this._id, this._options));
                }
                catch (error1) {
                    error = error1;
                    throw new Error('not found');
                }
                if (!record) {
                    throw new Error('not found');
                }
                return record;
            }
            expected_count = void 0;
            if (this._id || this._find_single_id) {
                if (Array.isArray(this._id)) {
                    if (this._id.length === 0) {
                        return [];
                    }
                    this._conditions.push({
                        id: {
                            $in: this._id
                        }
                    });
                    expected_count = this._id.length;
                }
                else {
                    this._conditions.push({
                        id: this._id
                    });
                    expected_count = 1;
                }
            }
            if (!(options != null ? options.skip_log : void 0)) {
                this._connection.log(this._name, 'find', {
                    conditions: this._conditions,
                    options: this._options
                });
            }
            records = (yield this._adapter.find(this._name, this._conditions, this._options));
            if (expected_count != null) {
                if (records.length !== expected_count) {
                    throw new Error('not found');
                }
            }
            if (this._preserve_order_ids) {
                records = this._preserve_order_ids.map(function (id) {
                    var i, len;
                    for (i = 0, len = records.length; i < len; i++) {
                        record = records[i];
                        if (record.id === id) {
                            return record;
                        }
                    }
                });
            }
            if (this._options.one) {
                if (records.length > 1) {
                    throw new Error('unknown error');
                }
                if (records.length === 1) {
                    return records[0];
                }
                else {
                    return null;
                }
            }
            else {
                return records;
            }
        });
    }
    _execAndInclude(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var records;
            records = (yield this._exec(options));
            yield Promise.all(this._includes.map((include) => __awaiter(this, void 0, void 0, function* () {
                return (yield this._connection.fetchAssociated(records, include.column, include.select, {
                    model: this._model,
                    lean: this._options.lean
                }));
            })));
            return records;
        });
    }
    _validateAndBuildSaveData(errors, data, updates, path, object) {
        var column, error, model, property, schema, temp;
        model = this._model;
        schema = model._schema;
        for (column in object) {
            property = schema[path + column];
            if (property) {
                try {
                    model._validateColumn(updates, path + column, property, true);
                }
                catch (error1) {
                    error = error1;
                    errors.push(error);
                }
                model._buildSaveDataColumn(data, updates, path + column, property, true);
            }
            else if (!object[column] && model._intermediate_paths[column]) {
                // set all nested columns null
                column += '.';
                temp = {};
                Object.keys(schema).forEach(function (sc) {
                    if (sc.indexOf(column) === 0) {
                        return temp[sc.substr(column.length)] = null;
                    }
                });
                this._validateAndBuildSaveData(errors, data, updates, path + column, temp);
            }
            else if (typeof object[column] === 'object') {
                this._validateAndBuildSaveData(errors, data, updates, path + column + '.', object[column]);
            }
        }
    }
    _doIntegrityActions(integrities, ids) {
        return __awaiter(this, void 0, void 0, function* () {
            var promises;
            promises = integrities.map((integrity) => __awaiter(this, void 0, void 0, function* () {
                var count;
                if (integrity.type === 'parent_nullify') {
                    return (yield integrity.child.update(_.zipObject([integrity.column], [null]), _.zipObject([integrity.column], [ids])));
                }
                else if (integrity.type === 'parent_restrict') {
                    count = (yield integrity.child.count(_.zipObject([integrity.column], [ids])));
                    if (count > 0) {
                        throw new Error('rejected');
                    }
                }
                else if (integrity.type === 'parent_delete') {
                    return (yield integrity.child.delete(_.zipObject([integrity.column], [ids])));
                }
            }));
            return (yield Promise.all(promises));
        });
    }
    _doArchiveAndIntegrity(options) {
        return __awaiter(this, void 0, void 0, function* () {
            var archive_records, ids, integrities, need_archive, need_child_archive, need_integrity, query, records;
            need_archive = this._model.archive;
            integrities = this._model._integrities.filter(function (integrity) {
                return integrity.type.substr(0, 7) === 'parent_';
            });
            need_child_archive = integrities.some((integrity) => {
                return integrity.child.archive;
            });
            need_integrity = need_child_archive || (integrities.length > 0 && !this._adapter.native_integrity);
            if (!need_archive && !need_integrity) {
                return;
            }
            // find all records to be deleted
            query = this._model.where(this._conditions);
            if (!need_archive) { // we need only id field for integrity
                query.select('');
            }
            records = (yield query.exec({
                skip_log: options != null ? options.skip_log : void 0
            }));
            if (need_archive) {
                archive_records = records.map((record) => {
                    return {
                        model: this._name,
                        data: record
                    };
                });
                yield this._connection.models['_Archive'].createBulk(archive_records);
            }
            if (!need_integrity) {
                return;
            }
            if (records.length === 0) {
                return;
            }
            ids = records.map(function (record) {
                return record.id;
            });
            yield this._doIntegrityActions(integrities, ids);
        });
    }
    _addCondition(condition) {
        var keys;
        if (this._options.group_fields) {
            keys = Object.keys(condition);
            if (keys.length === 1 && this._options.group_fields.hasOwnProperty(keys[0])) {
                this._options.conditions_of_group.push(condition);
                return;
            }
        }
        return this._conditions.push(condition);
    }
}
exports.Query = Query;
