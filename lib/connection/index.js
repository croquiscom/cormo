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
const events_1 = require("events");
const _ = require("lodash");
const Toposort = require("toposort-class");
const util_1 = require("util");
const model_1 = require("../model");
const types = require("../types");
const inflector = require("../util/inflector");
try {
    // tslint:disable-next-line:no-var-requires
    redis = require('redis');
}
catch (error) {
    /**/
}
/**
 * Manages connection to a database
 */
class Connection extends events_1.EventEmitter {
    constructor(adapter_name, settings) {
        super();
        if (settings.is_default !== false) {
            Connection.defaultConnection = this;
        }
        const redis_cache = settings.redis_cache || {};
        this._redis_cache_settings = redis_cache;
        this.connected = false;
        this.models = {};
        this._pending_associations = [];
        this._schema_changed = false;
        this._adapter = require(__dirname + '/../adapters/' + adapter_name).default(this);
        this._promise_connection = this._adapter.connect(settings).then(() => {
            this.connected = true;
        }).catch((error) => {
            this._adapter = undefined;
            console.log('fail to connect', error);
        });
        Object.defineProperty(this, 'adapter', {
            get() { return this._adapter; },
        });
    }
    /**
     * Closes this connection.
     * A closed connection can be used no more.
     */
    close() {
        if (Connection.defaultConnection === this) {
            Connection.defaultConnection = undefined;
        }
        this._adapter.close();
        this._adapter = undefined;
    }
    /**
     * Creates a model class
     */
    model(name, schema) {
        return model_1.Model.newModel(this, name, schema);
    }
    /**
     * Applies schemas
     * @see AdapterBase::applySchema
     */
    applySchemas(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this._initializeModels();
            if (!this._schema_changed) {
                return;
            }
            this._applyAssociations();
            if (this._applying_schemas) {
                return this._promise_schema_applied;
            }
            this._applying_schemas = true;
            this._checkArchive();
            if (options.verbose) {
                console.log('Applying schemas');
            }
            this._promise_schema_applied = this._promise_connection.then(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const current = yield this._adapter.getSchemas();
                    const add_columns_commands = [];
                    // tslint:disable-next-line:forin
                    for (const model in this.models) {
                        const modelClass = this.models[model];
                        const currentTable = current.tables && current.tables[modelClass.tableName];
                        if (!currentTable || currentTable === 'NO SCHEMA') {
                            continue;
                        }
                        // tslint:disable-next-line:forin
                        for (const column in modelClass._schema) {
                            const property = modelClass._schema[column];
                            if (!currentTable[property._dbname]) {
                                if (options.verbose) {
                                    console.log(`Adding column ${column} to ${modelClass.tableName}`);
                                }
                                add_columns_commands.push(this._adapter.addColumn(model, property));
                            }
                        }
                    }
                    yield Promise.all(add_columns_commands);
                    const tables_commands = [];
                    // tslint:disable-next-line:forin
                    for (const model in this.models) {
                        const modelClass = this.models[model];
                        if (!current.tables[modelClass.tableName]) {
                            if (options.verbose) {
                                console.log(`Creating table ${modelClass.tableName}`);
                            }
                            tables_commands.push(this._adapter.createTable(model));
                        }
                    }
                    yield Promise.all(tables_commands);
                    const indexes_commands = [];
                    // tslint:disable-next-line:forin
                    for (const model in this.models) {
                        const modelClass = this.models[model];
                        for (const index of modelClass._indexes) {
                            if (!(current.indexes && current.indexes[modelClass.tableName]
                                && current.indexes[modelClass.tableName][index.options.name])) {
                                if (options.verbose) {
                                    console.log(`Creating index on ${modelClass.tableName} ${Object.keys(index.columns)}`);
                                }
                                indexes_commands.push(this._adapter.createIndex(model, index));
                            }
                        }
                    }
                    yield Promise.all(indexes_commands);
                    const foreign_keys_commands = [];
                    // tslint:disable-next-line:forin
                    for (const model in this.models) {
                        const modelClass = this.models[model];
                        for (const integrity of modelClass._integrities) {
                            let type = '';
                            if (integrity.type === 'child_nullify') {
                                type = 'nullify';
                            }
                            else if (integrity.type === 'child_restrict') {
                                type = 'restrict';
                            }
                            else if (integrity.type === 'child_delete') {
                                type = 'delete';
                            }
                            if (type) {
                                const current_foreign_key = current.foreign_keys && current.foreign_keys[modelClass.tableName]
                                    && current.foreign_keys[modelClass.tableName][integrity.column];
                                if (!(current_foreign_key && current_foreign_key === integrity.parent.tableName)) {
                                    if (options.verbose) {
                                        const parentTableName = integrity.parent.tableName;
                                        console.log(`Adding foreign key ${modelClass.tableName}.${integrity.column} to ${parentTableName}`);
                                    }
                                    foreign_keys_commands.push([model, integrity.column, type, integrity.parent]);
                                }
                            }
                        }
                    }
                    for (const args of foreign_keys_commands) {
                        yield this._adapter.createForeignKey.apply(this._adapter, args);
                    }
                }
                finally {
                    if (options.verbose) {
                        console.log('Applying schemas done');
                    }
                    this._applying_schemas = false;
                    this._schema_changed = false;
                }
            }));
            return this._promise_schema_applied;
        });
    }
    /**
     * Drops all model tables
     */
    dropAllModels() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const model of this._getModelNamesByAssociationOrder()) {
                yield this.models[model].drop();
            }
        });
    }
    /**
     * Logs
     */
    log(model, type, data) { }
    inspect() {
        return util_1.inspect(this.models);
    }
    /**
     * Manipulate data
     */
    manipulate(commands) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log('<conn>', 'manipulate', commands);
            yield this._checkSchemaApplied();
            const id_to_record_map = {};
            if (!Array.isArray(commands)) {
                commands = [commands];
            }
            for (const command of commands) {
                let key;
                let data;
                if (typeof command === 'object') {
                    key = Object.keys(command);
                    if (key.length === 1) {
                        key = key[0];
                        data = command[key];
                    }
                    else {
                        key = void 0;
                    }
                }
                else if (typeof command === 'string') {
                    key = command;
                }
                if (!key) {
                    throw new Error('invalid command: ' + JSON.stringify(command));
                }
                else if (key.substr(0, 7) === 'create_') {
                    const model = key.substr(7);
                    const id = data.id;
                    delete data.id;
                    this._manipulateConvertIds(id_to_record_map, model, data);
                    const record = yield this._manipulateCreate(model, data);
                    if (id) {
                        id_to_record_map[id] = record;
                    }
                }
                else if (key.substr(0, 7) === 'delete_') {
                    const model = key.substr(7);
                    yield this._manipulateDelete(model, data);
                }
                else if (key === 'deleteAll') {
                    yield this._manipulateDeleteAllModels();
                }
                else if (key.substr(0, 5) === 'drop_') {
                    const model = key.substr(5);
                    yield this._manipulateDropModel(model);
                }
                else if (key === 'dropAll') {
                    yield this._manipulateDropAllModels();
                }
                else if (key.substr(0, 5) === 'find_') {
                    const model = key.substr(5);
                    const id = data.id;
                    delete data.id;
                    if (!id) {
                        continue;
                    }
                    const records = yield this._manipulateFind(model, data);
                    id_to_record_map[id] = records;
                }
                else {
                    throw new Error('unknown command: ' + key);
                }
            }
            return id_to_record_map;
        });
    }
    /**
     * Adds an association
     * @see Model.hasMany
     * @see Model.belongsTo
     */
    addAssociation(association) {
        this._pending_associations.push(association);
        this._schema_changed = true;
    }
    /**
     * Returns inconsistent records against associations
     */
    getInconsistencies() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._checkSchemaApplied();
            const result = {};
            const promises = Object.keys(this.models).map((model) => __awaiter(this, void 0, void 0, function* () {
                const modelClass = this.models[model];
                const integrities = modelClass._integrities.filter((integrity) => integrity.type.substr(0, 7) === 'parent_');
                if (integrities.length > 0) {
                    let records = yield modelClass.select('');
                    const ids = records.map((record) => record.id);
                    const sub_promises = integrities.map((integrity) => __awaiter(this, void 0, void 0, function* () {
                        const query = integrity.child.select('');
                        query.where(_.zipObject([integrity.column], [{ $not: { $in: ids } }]));
                        const property = integrity.child._schema[integrity.column];
                        if (!property.required) {
                            query.where(_.zipObject([integrity.column], [{ $not: null }]));
                        }
                        records = yield query.exec();
                        if (records.length > 0) {
                            const array = result[integrity.child._name] || (result[integrity.child._name] = []);
                            [].push.apply(array, records.map((record) => record.id));
                            _.uniq(array);
                        }
                    }));
                    yield Promise.all(sub_promises);
                }
            }));
            yield Promise.all(promises);
            return result;
        });
    }
    /**
     * Fetches associated records
     */
    fetchAssociated(records, column, select, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if ((select != null) && typeof select === 'object') {
                options = select;
                select = null;
            }
            else if (options == null) {
                options = {};
            }
            yield this._checkSchemaApplied();
            const record = Array.isArray(records) ? records[0] : records;
            if (!record) {
                return;
            }
            let association;
            if (options.target_model) {
                association = {
                    foreign_key: options.foreign_key,
                    target_model: options.target_model,
                    type: options.type || 'belongsTo',
                };
            }
            else if (options.model) {
                association = options.model._associations && options.model._associations[column];
            }
            else {
                association = record.constructor._associations && record.constructor._associations[column];
            }
            if (!association) {
                throw new Error(`unknown column '${column}'`);
            }
            if (association.type === 'belongsTo') {
                return yield this._fetchAssociatedBelongsTo(records, association.target_model, column, select, options);
            }
            else if (association.type === 'hasMany') {
                return yield this._fetchAssociatedHasMany(records, association.target_model, association.foreign_key, column, select, options);
            }
            else {
                throw new Error(`unknown column '${column}'`);
            }
        });
    }
    _checkSchemaApplied() {
        return __awaiter(this, void 0, void 0, function* () {
            this._initializeModels();
            if (!this._applying_schemas && !this._schema_changed) {
                return;
            }
            return yield this.applySchemas();
        });
    }
    _connectRedisCache() {
        if (this._redis_cache_client) {
            return this._redis_cache_client;
        }
        else if (!redis) {
            throw new Error('cache needs Redis');
        }
        else {
            const settings = this._redis_cache_settings;
            const client = settings.client || (redis.createClient(settings.port || 6379, settings.host || '127.0.0.1'));
            this._redis_cache_client = client;
            if (settings.database != null) {
                client.select(settings.database);
                client.once('connect', () => {
                    client.send_anyways = true;
                    client.select(settings.database);
                    client.send_anyways = false;
                });
            }
            return client;
        }
    }
    _initializeModels() {
        // tslint:disable-next-line:forin
        for (const model in this.models) {
            const modelClass = this.models[model];
            if (modelClass.initialize && !modelClass._initialize_called) {
                modelClass.initialize();
                modelClass._initialize_called = true;
            }
        }
    }
    _checkArchive() {
        // tslint:disable-next-line:forin
        for (const model in this.models) {
            const modelClass = this.models[model];
            if (modelClass.archive && !modelClass._connection.models.hasOwnProperty('_Archive')) {
                // tslint:disable-next-line:max-classes-per-file
                const _Archive = class extends model_1.Model {
                };
                _Archive.connection(modelClass._connection);
                _Archive.archive = false;
                _Archive.column('model', String);
                _Archive.column('data', Object);
            }
        }
    }
    _getModelNamesByAssociationOrder() {
        const t = new Toposort();
        // tslint:disable-next-line:forin
        for (const model in this.models) {
            const modelClass = this.models[model];
            t.add(model, []);
            // tslint:disable-next-line:forin
            for (const name in modelClass._associations) {
                const association = modelClass._associations[name];
                // ignore association with models of other connection
                if (association.target_model._connection !== this) {
                    continue;
                }
                // ignore self association
                if (association.target_model === modelClass) {
                    continue;
                }
                const type = association.type;
                if (type === 'hasMany' || type === 'hasOne') {
                    t.add(association.target_model._name, model);
                }
                else if (type === 'belongsTo') {
                    t.add(model, association.target_model._name);
                }
            }
        }
        return t.sort();
    }
    _manipulateCreate(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            model = inflector.camelize(model);
            if (!this.models[model]) {
                throw new Error(`model ${model} does not exist`);
            }
            return yield this.models[model].create(data, { skip_log: true });
        });
    }
    _manipulateDelete(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            model = inflector.camelize(model);
            if (!this.models[model]) {
                throw new Error(`model ${model} does not exist`);
            }
            yield this.models[model].where(data).delete({ skip_log: true });
        });
    }
    _manipulateDeleteAllModels() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const model of Object.keys(this.models)) {
                if (model === '_Archive') {
                    return;
                }
                yield this.models[model].where().delete({ skip_log: true });
            }
        });
    }
    _manipulateDropModel(model) {
        return __awaiter(this, void 0, void 0, function* () {
            model = inflector.camelize(model);
            if (!this.models[model]) {
                throw new Error(`model ${model} does not exist`);
            }
            yield this.models[model].drop();
        });
    }
    _manipulateDropAllModels() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.dropAllModels();
        });
    }
    _manipulateFind(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            model = inflector.camelize(inflector.singularize(model));
            if (!this.models[model]) {
                throw new Error(`model ${model} does not exist`);
            }
            return yield this.models[model].where(data).exec({ skip_log: true });
        });
    }
    _manipulateConvertIds(id_to_record_map, model, data) {
        model = inflector.camelize(model);
        if (!this.models[model]) {
            return;
        }
        // tslint:disable-next-line:forin
        for (const column in this.models[model]._schema) {
            const property = this.models[model]._schema[column];
            if (property.record_id && data.hasOwnProperty(column)) {
                if (property.array && Array.isArray(data[column])) {
                    data[column] = data[column].map((value) => {
                        const record = id_to_record_map[value];
                        if (record) {
                            return record.id;
                        }
                        else {
                            return value;
                        }
                    });
                }
                else {
                    const record = id_to_record_map[data[column]];
                    if (record) {
                        data[column] = record.id;
                    }
                }
            }
        }
    }
    /**
     * Applies pending associations
     */
    _applyAssociations() {
        for (const item of this._pending_associations) {
            const this_model = item.this_model;
            const options = item.options;
            let target_model;
            if (typeof item.target_model_or_column === 'string') {
                let models;
                if (item.options && item.options.connection) {
                    models = item.options.connection.models;
                }
                else {
                    models = this.models;
                }
                if (item.options && item.options.type) {
                    target_model = item.options.type;
                    options.as = item.target_model_or_column;
                }
                else if (item.type === 'belongsTo' || item.type === 'hasOne') {
                    target_model = inflector.camelize(item.target_model_or_column);
                }
                else {
                    target_model = inflector.classify(item.target_model_or_column);
                }
                if (!models[target_model]) {
                    throw new Error(`model ${target_model} does not exist`);
                }
                target_model = models[target_model];
            }
            else {
                target_model = item.target_model_or_column;
            }
            this['_' + item.type](this_model, target_model, options);
        }
        this._pending_associations = [];
    }
    /**
     * Adds a has-many association
     */
    _hasMany(this_model, target_model, options) {
        let foreign_key;
        if (options != null ? options.foreign_key : void 0) {
            foreign_key = options.foreign_key;
        }
        else if (options != null ? options.as : void 0) {
            foreign_key = options.as + '_id';
        }
        else {
            foreign_key = inflector.foreign_key(this_model._name);
        }
        target_model.column(foreign_key, { type: types.RecordID, connection: this_model._connection });
        const integrity = options && options.integrity || 'ignore';
        target_model._integrities.push({ type: 'child_' + integrity, column: foreign_key, parent: this_model });
        this_model._integrities.push({ type: 'parent_' + integrity, column: foreign_key, child: target_model });
        const column = options && options.as || inflector.tableize(target_model._name);
        const columnCache = '__cache_' + column;
        const columnGetter = '__getter_' + column;
        this_model._associations[column] = { type: 'hasMany', target_model, foreign_key };
        Object.defineProperty(this_model.prototype, column, {
            get() {
                let getter;
                // getter must be created per instance due to __scope
                if (!this.hasOwnProperty(columnGetter)) {
                    getter = (reload) => __awaiter(this, void 0, void 0, function* () {
                        // this is getter.__scope in normal case (this_model_instance.target_model_name()),
                        // but use getter.__scope for safety
                        const self = getter.__scope;
                        if ((!self[columnCache] || reload) && self.id) {
                            const records = yield target_model.where(_.zipObject([foreign_key], [self.id]));
                            self[columnCache] = records;
                            return records;
                        }
                        else {
                            return self[columnCache] || [];
                        }
                    });
                    getter.build = (data) => {
                        // this is getter, so use getter.__scope instead
                        const self = getter.__scope;
                        const new_object = new target_model(data);
                        new_object[foreign_key] = self.id;
                        if (!self[columnCache]) {
                            self[columnCache] = [];
                        }
                        self[columnCache].push(new_object);
                        return new_object;
                    };
                    getter.__scope = this;
                    Object.defineProperty(this, columnCache, { value: null, writable: true });
                    Object.defineProperty(this, columnGetter, { value: getter });
                }
                return this[columnGetter];
            },
        });
    }
    /**
     * Adds a has-one association
     */
    _hasOne(this_model, target_model, options) {
        let foreign_key;
        if (options != null ? options.foreign_key : void 0) {
            foreign_key = options.foreign_key;
        }
        else if (options != null ? options.as : void 0) {
            foreign_key = options.as + '_id';
        }
        else {
            foreign_key = inflector.foreign_key(this_model._name);
        }
        target_model.column(foreign_key, { type: types.RecordID, connection: this_model._connection });
        const integrity = options && options.integrity || 'ignore';
        target_model._integrities.push({ type: 'child_' + integrity, column: foreign_key, parent: this_model });
        this_model._integrities.push({ type: 'parent_' + integrity, column: foreign_key, child: target_model });
        const column = options && options.as || inflector.underscore(target_model._name);
        const columnCache = '__cache_' + column;
        const columnGetter = '__getter_' + column;
        this_model._associations[column] = { type: 'hasOne', target_model };
        Object.defineProperty(this_model.prototype, column, {
            get() {
                let getter;
                // getter must be created per instance due to __scope
                if (!this.hasOwnProperty(columnGetter)) {
                    getter = (reload) => __awaiter(this, void 0, void 0, function* () {
                        // this is getter.__scope in normal case (this_model_instance.target_model_name()),
                        // but use getter.__scope for safety
                        const self = getter.__scope;
                        if ((!self[columnCache] || reload) && self.id) {
                            const records = yield target_model.where(_.zipObject([foreign_key], [self.id]));
                            if (records.length > 1) {
                                throw new Error('integrity error');
                            }
                            const record = records.length === 0 ? null : records[0];
                            self[columnCache] = record;
                            return record;
                        }
                        else {
                            return self[columnCache];
                        }
                    });
                    getter.__scope = this;
                    Object.defineProperty(this, columnCache, { value: null, writable: true });
                    Object.defineProperty(this, columnGetter, { value: getter });
                }
                return this[columnGetter];
            },
        });
    }
    /**
     * Adds a belongs-to association
     */
    _belongsTo(this_model, target_model, options) {
        let foreign_key;
        if (options != null ? options.foreign_key : void 0) {
            foreign_key = options.foreign_key;
        }
        else if (options != null ? options.as : void 0) {
            foreign_key = options.as + '_id';
        }
        else {
            foreign_key = inflector.foreign_key(target_model._name);
        }
        this_model.column(foreign_key, {
            connection: target_model._connection,
            required: options && options.required,
            type: types.RecordID,
        });
        const column = options && options.as || inflector.underscore(target_model._name);
        const columnCache = '__cache_' + column;
        const columnGetter = '__getter_' + column;
        this_model._associations[column] = { type: 'belongsTo', target_model };
        Object.defineProperty(this_model.prototype, column, {
            get() {
                let getter;
                // getter must be created per instance due to __scope
                if (!this.hasOwnProperty(columnGetter)) {
                    getter = (reload) => __awaiter(this, void 0, void 0, function* () {
                        // this is getter.__scope in normal case (this_model_instance.target_model_name()),
                        // but use getter.__scope for safety
                        const self = getter.__scope;
                        if ((!self[columnCache] || reload) && self[foreign_key]) {
                            const record = yield target_model.find(self[foreign_key]);
                            self[columnCache] = record;
                            return record;
                        }
                        else {
                            return self[columnCache];
                        }
                    });
                    getter.__scope = this;
                    Object.defineProperty(this, columnCache, { value: null, writable: true });
                    Object.defineProperty(this, columnGetter, { value: getter });
                }
                return this[columnGetter];
            },
        });
    }
    _fetchAssociatedBelongsTo(records, target_model, column, select, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const id_column = column + '_id';
            if (Array.isArray(records)) {
                const id_to_record_map = {};
                records.forEach((record) => {
                    const id = record[id_column];
                    if (id) {
                        (id_to_record_map[id] || (id_to_record_map[id] = [])).push(record);
                    }
                });
                const ids = Object.keys(id_to_record_map);
                const query = target_model.where({ id: ids });
                if (select) {
                    query.select(select);
                }
                if (options.lean) {
                    query.lean();
                }
                try {
                    const sub_records = yield query.exec();
                    sub_records.forEach((sub_record) => {
                        id_to_record_map[sub_record.id].forEach((record) => {
                            if (options.lean) {
                                record[column] = sub_record;
                            }
                            else {
                                Object.defineProperty(record, column, { enumerable: true, value: sub_record });
                            }
                        });
                    });
                    records.forEach((record) => {
                        if (!record.hasOwnProperty(column)) {
                            if (options.lean) {
                                record[column] = null;
                            }
                            else {
                                Object.defineProperty(record, column, { enumerable: true, value: null });
                            }
                        }
                    });
                }
                catch (error) {
                    //
                }
            }
            else {
                const id = records[id_column];
                if (id) {
                    const query = target_model.find(id);
                    if (select) {
                        query.select(select);
                    }
                    if (options.lean) {
                        query.lean();
                    }
                    try {
                        const sub_record = yield query.exec();
                        if (options.lean) {
                            records[column] = sub_record;
                        }
                        else {
                            Object.defineProperty(records, column, { enumerable: true, value: sub_record });
                        }
                    }
                    catch (error) {
                        if (error && error.message !== 'not found') {
                            throw error;
                        }
                        if (!records.hasOwnProperty(column)) {
                            if (options.lean) {
                                records[column] = null;
                            }
                            else {
                                Object.defineProperty(records, column, { enumerable: true, value: null });
                            }
                        }
                    }
                }
                else if (!records.hasOwnProperty(column)) {
                    if (options.lean) {
                        records[column] = null;
                    }
                    else {
                        Object.defineProperty(records, column, { enumerable: true, value: null });
                    }
                }
            }
        });
    }
    _fetchAssociatedHasMany(records, target_model, foreign_key, column, select, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (Array.isArray(records)) {
                const ids = records.map((record) => {
                    if (options.lean) {
                        record[column] = [];
                    }
                    else {
                        Object.defineProperty(record, column, { enumerable: true, value: [] });
                    }
                    return record.id;
                });
                const query = target_model.where(_.zipObject([foreign_key], [{ $in: ids }]));
                if (select) {
                    query.select(select + ' ' + foreign_key);
                }
                if (options.lean) {
                    query.lean();
                }
                try {
                    const sub_records = yield query.exec();
                    sub_records.forEach((sub_record) => {
                        records.forEach((record) => {
                            if (record.id === sub_record[foreign_key]) {
                                record[column].push(sub_record);
                            }
                        });
                    });
                }
                catch (error) {
                    //
                }
            }
            else {
                if (options.lean) {
                    records[column] = [];
                }
                else {
                    Object.defineProperty(records, column, { enumerable: true, value: [] });
                }
                const query = target_model.where(_.zipObject([foreign_key], [records.id]));
                if (select) {
                    query.select(select + ' ' + foreign_key);
                }
                if (options.lean) {
                    query.lean();
                }
                try {
                    const sub_records = yield query.exec();
                    sub_records.forEach((sub_record) => {
                        return records[column].push(sub_record);
                    });
                }
                catch (error) {
                    //
                }
            }
        });
    }
}
exports.Connection = Connection;
