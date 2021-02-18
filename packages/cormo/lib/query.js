"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Query = void 0;
const stream_1 = __importDefault(require("stream"));
const lodash_1 = __importDefault(require("lodash"));
/**
 * Collects conditions to query
 */
class Query {
    /**
     * Creates a query instance
     */
    constructor(model) {
        this._find_single_id = false;
        this._used = false;
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
            node: 'master',
            select_single: false,
        };
    }
    clone() {
        const cloned = new Query(this._model);
        cloned._ifs = lodash_1.default.cloneDeep(this._ifs);
        cloned._current_if = this._current_if;
        cloned._conditions = lodash_1.default.cloneDeep(this._conditions);
        cloned._includes = lodash_1.default.cloneDeep(this._includes);
        cloned._options = lodash_1.default.cloneDeep(this._options);
        cloned._find_single_id = this._find_single_id;
        cloned._used = false;
        return cloned;
    }
    find(id) {
        if (!this._current_if) {
            return this;
        }
        if (Array.isArray(id)) {
            this._id = lodash_1.default.uniq(id);
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
        this._id = lodash_1.default.uniq(ids);
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
                this._addCondition(cond);
            });
        }
        else if (condition != null) {
            this._addCondition(condition);
        }
        return this;
    }
    select(columns) {
        if (!this._current_if) {
            return this;
        }
        this._options.select_columns = undefined;
        this._options.select_single = false;
        if (columns != null) {
            if (typeof columns === 'string') {
                columns = columns.split(/\s+/);
                columns.push('id');
            }
            if (columns.length > 0) {
                this._options.select_columns = columns;
            }
        }
        return this;
    }
    selectSingle(column) {
        if (!this._current_if) {
            return this;
        }
        this._options.select_columns = [column];
        this._options.select_single = true;
        return this;
    }
    /**
     * Specifies orders of result
     */
    order(orders) {
        if (!this._current_if) {
            return this;
        }
        this._options.orders = orders;
        return this;
    }
    group(group_by, fields) {
        if (!this._current_if) {
            return this;
        }
        this._options.group_by = undefined;
        if (group_by) {
            if (typeof group_by === 'string') {
                group_by = group_by.split(/\s+/);
            }
            this._options.group_by = group_by;
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
    transaction(transaction) {
        this._options.transaction = transaction;
        return this;
    }
    using(node) {
        this._options.node = node;
        return this;
    }
    index_hint(hint) {
        this._options.index_hint = hint;
        return this;
    }
    /**
     * Executes the query
     * @see AdapterBase::findById
     * @see AdapterBase::find
     */
    async exec(options) {
        this._setUsed();
        await this._model._checkReady();
        if (this._options.cache && this._options.cache.key) {
            try {
                // try cache
                return await this._model._loadFromCache(this._options.cache.key, this._options.cache.refresh);
            }
            catch (error) {
                // no cache, execute query
                const records = await this._execAndInclude(options);
                // save result to cache
                await this._model._saveToCache(this._options.cache.key, this._options.cache.ttl, records);
                return records;
            }
        }
        else {
            return await this._execAndInclude(options);
        }
    }
    /**
     * Executes the query and returns a readable stream
     * @see AdapterBase::findById
     * @see AdapterBase::find
     */
    stream() {
        this._setUsed();
        const transformer = new stream_1.default.Transform({ objectMode: true });
        transformer._transform = function (chunk, encoding, callback) {
            this.push(chunk);
            callback();
        };
        this._model._checkReady().then(() => {
            this._adapter.stream(this._name, this._conditions, this._getAdapterFindOptions())
                .on('error', (error) => {
                transformer.emit('error', error);
            }).pipe(transformer);
        });
        return transformer;
    }
    /**
     * Explains the query
     */
    async explain() {
        this._options.cache = undefined;
        this._options.explain = true;
        this._includes = [];
        return await this.exec({ skip_log: true });
    }
    then(onfulfilled, onrejected) {
        return this.exec().then(onfulfilled, onrejected);
    }
    /**
     * Executes the query as a count operation
     * @see AdapterBase::count
     */
    async count() {
        this._setUsed();
        await this._model._checkReady();
        if (this._id || this._find_single_id) {
            this._conditions.push({ id: this._id });
            delete this._id;
        }
        return await this._adapter.count(this._name, this._conditions, this._options);
    }
    /**
     * Executes the query as a update operation
     * @see AdapterBase::update
     */
    async update(updates) {
        this._setUsed();
        await this._model._checkReady();
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
        return await this._adapter.updatePartial(this._name, data, this._conditions, this._options);
    }
    /**
     * Executes the query as an insert or update operation
     * @see AdapterBase::upsert
     */
    async upsert(updates, options) {
        this._setUsed();
        await this._model._checkReady();
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
        this._connection.log(this._name, 'upsert', { data, conditions: this._conditions, options: Object.assign(Object.assign({}, this._options), options) });
        return await this._adapter.upsert(this._name, data, this._conditions, Object.assign(Object.assign({}, this._options), options));
    }
    /**
     * Executes the query as a delete operation
     * @see AdapterBase::delete
     */
    async delete(options) {
        this._setUsed();
        await this._model._checkReady();
        if (this._id || this._find_single_id) {
            this._conditions.push({ id: this._id });
            delete this._id;
        }
        if (!(options && options.skip_log)) {
            this._connection.log(this._name, 'delete', { conditions: this._conditions });
        }
        await this._doArchiveAndIntegrity(options);
        return await this._adapter.delete(this._name, this._conditions, { transaction: this._options.transaction });
    }
    async _exec(find_options, options) {
        if (this._find_single_id && this._conditions.length === 0) {
            if (!(options && options.skip_log)) {
                this._connection.log(this._name, 'find by id', { id: this._id, options: find_options });
            }
            if (!this._id) {
                throw new Error('not found');
            }
            let record;
            try {
                record = await this._adapter.findById(this._name, this._id, find_options);
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
            this._connection.log(this._name, 'find', { conditions: this._conditions, options: find_options });
        }
        let records = await this._adapter.find(this._name, this._conditions, find_options);
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
    }
    _getAdapterFindOptions() {
        const select = [];
        const select_raw = [];
        if (this._options.select_columns) {
            const schema_columns = Object.keys(this._model._schema);
            const intermediate_paths = this._model._intermediate_paths;
            this._options.select_columns.forEach((column) => {
                if (schema_columns.indexOf(column) >= 0) {
                    select.push(column);
                    select_raw.push(column);
                }
                else if (intermediate_paths[column]) {
                    // select all nested columns
                    select_raw.push(column);
                    column += '.';
                    schema_columns.forEach((sc) => {
                        if (sc.startsWith(column)) {
                            select.push(sc);
                        }
                    });
                }
            });
        }
        let group_by;
        if (this._options.group_by) {
            group_by = this._options.group_by.map((column) => {
                return this._model._schema[column]._dbname_us;
            }).filter((column) => column != null);
        }
        const orders = [];
        if (typeof this._options.orders === 'string') {
            const avaliable_columns = ['id'];
            avaliable_columns.push(...Object.keys(this._model._schema));
            if (this._options.group_fields) {
                avaliable_columns.push(...Object.keys(this._options.group_fields));
            }
            this._options.orders.split(/\s+/).forEach((order) => {
                let asc = true;
                if (order.startsWith('-')) {
                    asc = false;
                    order = order.slice(1);
                }
                if (avaliable_columns.indexOf(order) >= 0) {
                    orders.push(asc ? order : '-' + order);
                }
            });
        }
        return Object.assign({ conditions_of_group: this._options.conditions_of_group, explain: this._options.explain, group_by, group_fields: this._options.group_fields, lean: this._options.lean, limit: this._options.limit, near: this._options.near, node: this._options.node, index_hint: this._options.index_hint, orders, skip: this._options.skip, transaction: this._options.transaction }, (select_raw.length > 0 && { select, select_raw }));
    }
    async _execAndInclude(options) {
        const records = await this._exec(this._getAdapterFindOptions(), options);
        if (this._options.select_single) {
            if (Array.isArray(records)) {
                return lodash_1.default.map(records, this._options.select_columns[0]);
            }
            else {
                if (records) {
                    return records[this._options.select_columns[0]];
                }
                else {
                    return null;
                }
            }
        }
        await Promise.all(this._includes.map(async (include) => {
            await this._connection.fetchAssociated(records, include.column, include.select, {
                lean: this._options.lean,
                model: this._model,
                transaction: this._options.transaction,
            });
        }));
        return records;
    }
    _validateAndBuildSaveData(errors, data, updates, path, object) {
        const model = this._model;
        const schema = model._schema;
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
                    if (sc.startsWith(column)) {
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
    async _doIntegrityActions(integrities, ids) {
        const promises = integrities.map(async (integrity) => {
            if (integrity.type === 'parent_nullify') {
                await integrity.child.update(lodash_1.default.zipObject([integrity.column], [null]), lodash_1.default.zipObject([integrity.column], [ids]));
            }
            else if (integrity.type === 'parent_restrict') {
                const count = (await integrity.child.count(lodash_1.default.zipObject([integrity.column], [ids])));
                if (count > 0) {
                    throw new Error('rejected');
                }
            }
            else if (integrity.type === 'parent_delete') {
                await integrity.child.delete(lodash_1.default.zipObject([integrity.column], [ids]));
            }
        });
        await Promise.all(promises);
    }
    async _doArchiveAndIntegrity(options) {
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
        const records = await query.exec({ skip_log: options && options.skip_log });
        if (need_archive) {
            const archive_records = records.map((record) => {
                return { model: this._name, data: record };
            });
            await this._connection.models._Archive.createBulk(archive_records);
        }
        if (!need_integrity) {
            return;
        }
        if (records.length === 0) {
            return;
        }
        const ids = records.map((record) => record.id);
        await this._doIntegrityActions(integrities, ids);
    }
    _addCondition(condition) {
        if (this._options.group_fields) {
            const keys = Object.keys(condition);
            if (keys.length === 1 && Object.prototype.hasOwnProperty.call(this._options.group_fields, keys[0])) {
                this._options.conditions_of_group.push(condition);
            }
        }
        else {
            this._conditions.push(condition);
        }
    }
    _setUsed() {
        if (this._used) {
            throw new Error('Query object is already used');
        }
        this._used = true;
    }
}
exports.Query = Query;
