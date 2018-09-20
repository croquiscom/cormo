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
        this._find_single_id = false;
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
     */
    select(columns) {
        if (!this._current_if) {
            return this;
        }
        this._options.select = null;
        this._options.select_raw = null;
        if (typeof columns === 'string') {
            const schema_columns = Object.keys(this._model._schema);
            const intermediate_paths = this._model._intermediate_paths;
            const select = [];
            const select_raw = [];
            columns.split(/\s+/).forEach((column) => {
                if (schema_columns.indexOf(column) >= 0) {
                    select.push(column);
                    select_raw.push(column);
                }
                else if (intermediate_paths[column]) {
                    // select all nested columns
                    select_raw.push(column);
                    column += '.';
                    schema_columns.forEach((sc) => {
                        if (sc.indexOf(column) === 0) {
                            select.push(sc);
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
     */
    order(orders) {
        if (!this._current_if) {
            return this;
        }
        if (typeof orders === 'string') {
            const avaliable_columns = ['id'];
            [].push.apply(avaliable_columns, Object.keys(this._model._schema));
            if (this._options.group_fields) {
                [].push.apply(avaliable_columns, Object.keys(this._options.group_fields));
            }
            orders.split(/\s+/).forEach((order) => {
                let asc = true;
                if (order[0] === '-') {
                    asc = false;
                    order = order.slice(1);
                }
                if (avaliable_columns.indexOf(order) >= 0) {
                    this._options.orders.push(asc ? order : '-' + order);
                }
            });
        }
        return this;
    }
    group(group_by, fields) {
        if (!this._current_if) {
            return this;
        }
        this._options.group_by = null;
        const schema_columns = Object.keys(this._model._schema);
        if (typeof group_by === 'string') {
            const columns = group_by.split(/\s+/).filter((column) => {
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
     * @see Query::endif
     */
    if(condition) {
        this._ifs.push(condition);
        this._current_if = this._current_if && condition;
        return this;
    }
    /**
     * Ends last if
     * @chainable
     * @see Query::if
     */
    endif() {
        this._ifs.pop();
        this._current_if = true;
        for (const condition of this._ifs) {
            this._current_if = this._current_if && condition;
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
     */
    include(column, select) {
        if (!this._current_if) {
            return this;
        }
        this._includes.push({ column, select });
        return this;
    }
    /**
     * Executes the query
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
                    const records = yield this._execAndInclude(options);
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
     * @see AdapterBase::findById
     * @see AdapterBase::find
     */
    stream() {
        const transformer = new stream.Transform({ objectMode: true });
        transformer._transform = function (chunk, encoding, callback) {
            this.push(chunk);
            callback();
        };
        this._model._checkReady().then(() => {
            this._adapter.stream(this._name, this._conditions, this._options)
                .on('error', (error) => {
                transformer.emit('error', error);
            }).pipe(transformer);
        });
        return transformer;
    }
    /**
     * Explains the query
     */
    explain() {
        return __awaiter(this, void 0, void 0, function* () {
            this._options.cache = undefined;
            this._options.explain = true;
            this._includes = [];
            return yield this.exec({ skip_log: true });
        });
    }
    then(onfulfilled, onrejected) {
        return this.exec().then(onfulfilled, onrejected);
    }
    /**
     * Executes the query as a count operation
     * @see AdapterBase::count
     */
    count() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._model._checkReady();
            if (this._id || this._find_single_id) {
                this._conditions.push({ id: this._id });
                delete this._id;
            }
            return yield this._adapter.count(this._name, this._conditions, this._options);
        });
    }
    /**
     * Executes the query as a update operation
     * @see AdapterBase::update
     */
    update(updates) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._model._checkReady();
            const errors = [];
            const data = {};
            this._validateAndBuildSaveData(errors, data, updates, '', updates);
            if (errors.length > 0) {
                throw new Error(errors.join(','));
            }
            if (this._id || this._find_single_id) {
                this._conditions.push({ id: this._id });
                delete this._id;
            }
            this._connection.log(this._name, 'update', { data, conditions: this._conditions, options: this._options });
            return yield this._adapter.updatePartial(this._name, data, this._conditions, this._options);
        });
    }
    /**
     * Executes the query as an insert or update operation
     * @see AdapterBase::upsert
     */
    upsert(updates) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._model._checkReady();
            const errors = [];
            const data = {};
            this._validateAndBuildSaveData(errors, data, updates, '', updates);
            if (errors.length > 0) {
                throw new Error(errors.join(','));
            }
            if (this._id || this._find_single_id) {
                this._conditions.push({ id: this._id });
                delete this._id;
            }
            this._connection.log(this._name, 'upsert', { data, conditions: this._conditions, options: this._options });
            return yield this._adapter.upsert(this._name, data, this._conditions, this._options);
        });
    }
    /**
     * Executes the query as a delete operation
     * @see AdapterBase::delete
     */
    delete(options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._model._checkReady();
            if (this._id || this._find_single_id) {
                this._conditions.push({ id: this._id });
                delete this._id;
            }
            if (!(options != null ? options.skip_log : void 0)) {
                this._connection.log(this._name, 'delete', { conditions: this._conditions });
            }
            yield this._doArchiveAndIntegrity(options);
            return yield this._adapter.delete(this._name, this._conditions);
        });
    }
    _exec(options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._find_single_id && this._conditions.length === 0) {
                if (!(options && options.skip_log)) {
                    this._connection.log(this._name, 'find by id', { id: this._id, options: this._options });
                }
                if (!this._id) {
                    throw new Error('not found');
                }
                let record;
                try {
                    record = (yield this._adapter.findById(this._name, this._id, this._options));
                }
                catch (error) {
                    throw new Error('not found');
                }
                if (!record) {
                    throw new Error('not found');
                }
                return record;
            }
            let expected_count;
            if (this._id || this._find_single_id) {
                if (Array.isArray(this._id)) {
                    if (this._id.length === 0) {
                        return [];
                    }
                    this._conditions.push({ id: { $in: this._id } });
                    expected_count = this._id.length;
                }
                else {
                    this._conditions.push({ id: this._id });
                    expected_count = 1;
                }
            }
            if (!(options && options.skip_log)) {
                this._connection.log(this._name, 'find', { conditions: this._conditions, options: this._options });
            }
            let records = yield this._adapter.find(this._name, this._conditions, this._options);
            if (expected_count != null) {
                if (records.length !== expected_count) {
                    throw new Error('not found');
                }
            }
            if (this._preserve_order_ids) {
                records = this._preserve_order_ids.map((id) => {
                    for (const record of records) {
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
            const records = yield this._exec(options);
            yield Promise.all(this._includes.map((include) => __awaiter(this, void 0, void 0, function* () {
                yield this._connection.fetchAssociated(records, include.column, include.select, {
                    lean: this._options.lean,
                    model: this._model,
                });
            })));
            return records;
        });
    }
    _validateAndBuildSaveData(errors, data, updates, path, object) {
        const model = this._model;
        const schema = model._schema;
        // tslint:disable-next-line:forin
        for (let column in object) {
            const property = schema[path + column];
            if (property) {
                try {
                    model._validateColumn(updates, path + column, property, true);
                }
                catch (error) {
                    errors.push(error.message);
                }
                model._buildSaveDataColumn(data, updates, path + column, property, true);
            }
            else if (!object[column] && model._intermediate_paths[column]) {
                // set all nested columns null
                column += '.';
                const temp = {};
                Object.keys(schema).forEach((sc) => {
                    if (sc.indexOf(column) === 0) {
                        temp[sc.substr(column.length)] = null;
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
            const promises = integrities.map((integrity) => __awaiter(this, void 0, void 0, function* () {
                if (integrity.type === 'parent_nullify') {
                    yield integrity.child.update(_.zipObject([integrity.column], [null]), _.zipObject([integrity.column], [ids]));
                }
                else if (integrity.type === 'parent_restrict') {
                    const count = (yield integrity.child.count(_.zipObject([integrity.column], [ids])));
                    if (count > 0) {
                        throw new Error('rejected');
                    }
                }
                else if (integrity.type === 'parent_delete') {
                    yield integrity.child.delete(_.zipObject([integrity.column], [ids]));
                }
            }));
            yield Promise.all(promises);
        });
    }
    _doArchiveAndIntegrity(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const need_archive = this._model.archive;
            const integrities = this._model._integrities.filter((integrity) => integrity.type.substr(0, 7) === 'parent_');
            const need_child_archive = integrities.some((integrity) => integrity.child.archive);
            const need_integrity = need_child_archive || (integrities.length > 0 && !this._adapter.native_integrity);
            if (!need_archive && !need_integrity) {
                return;
            }
            // find all records to be deleted
            const query = this._model.where(this._conditions);
            if (!need_archive) { // we need only id field for integrity
                query.select('');
            }
            const records = yield query.exec({ skip_log: options && options.skip_log });
            if (need_archive) {
                const archive_records = records.map((record) => {
                    return { model: this._name, data: record };
                });
                yield this._connection.models._Archive.createBulk(archive_records);
            }
            if (!need_integrity) {
                return;
            }
            if (records.length === 0) {
                return;
            }
            const ids = records.map((record) => record.id);
            yield this._doIntegrityActions(integrities, ids);
        });
    }
    _addCondition(condition) {
        if (this._options.group_fields) {
            const keys = Object.keys(condition);
            if (keys.length === 1 && this._options.group_fields.hasOwnProperty(keys[0])) {
                this._options.conditions_of_group.push(condition);
                return;
            }
        }
        return this._conditions.push(condition);
    }
}
exports.Query = Query;
