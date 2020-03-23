"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
let redis;
const events_1 = require("events");
const util_1 = require("util");
const lodash_1 = __importDefault(require("lodash"));
const mongodb_1 = require("../adapters/mongodb");
const mysql_1 = require("../adapters/mysql");
const postgresql_1 = require("../adapters/postgresql");
const sqlite3_1 = require("../adapters/sqlite3");
const logger_1 = require("../logger");
const model_1 = require("../model");
const transaction_1 = require("../transaction");
const types = __importStar(require("../types"));
const inflector = __importStar(require("../util/inflector"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Toposort = require('toposort-class');
try {
    redis = require('redis');
}
catch (error) {
    /**/
}
/**
 * Manages connection to a database
 */
class Connection extends events_1.EventEmitter {
    constructor(adapter, settings) {
        var _a;
        super();
        /** @internal */
        this._schema_changed = false;
        /** @internal */
        this._connected = false;
        /** @internal */
        this._applying_schemas = false;
        /** @internal */
        this._implicit_apply_schemas = false;
        if (settings.is_default !== false) {
            Connection.defaultConnection = this;
        }
        this._implicit_apply_schemas = (_a = settings.implicit_apply_schemas) !== null && _a !== void 0 ? _a : false;
        const redis_cache = settings.redis_cache || {};
        this._redis_cache_settings = redis_cache;
        this.models = {};
        this._pending_associations = [];
        if (typeof adapter === 'string') {
            this._adapter = require(__dirname + '/../adapters/' + adapter).createAdapter(this);
        }
        else {
            this._adapter = adapter(this);
        }
        this._promise_connection = this._connect(settings);
        this.setLogger(settings.logger);
    }
    get adapter() {
        return this._adapter;
    }
    /**
     * Set logger
     */
    setLogger(logger) {
        if (logger) {
            if (logger === 'console') {
                this._logger = new logger_1.ConsoleLogger();
            }
            else if (logger === 'color-console') {
                this._logger = new logger_1.ColorConsoleLogger();
            }
            else if (logger === 'empty') {
                this._logger = new logger_1.EmptyLogger();
            }
            else {
                this._logger = logger;
            }
        }
        else {
            this._logger = new logger_1.EmptyLogger();
        }
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
        return model_1.BaseModel.newModel(this, name, schema);
    }
    /**
     * Applies schemas
     * @see AdapterBase::applySchema
     */
    async applySchemas(options = {}) {
        this._initializeModels();
        if (!this._schema_changed) {
            return;
        }
        this.applyAssociations();
        if (this._applying_schemas) {
            return this._promise_schema_applied;
        }
        this._applying_schemas = true;
        this._checkArchive();
        if (options.verbose) {
            console.log('Applying schemas');
        }
        this._promise_schema_applied = this._promise_connection.then(async () => {
            var _a, _b;
            try {
                const current = await this._adapter.getSchemas();
                for (const model in this.models) {
                    const modelClass = this.models[model];
                    const currentTable = current.tables && current.tables[modelClass.table_name];
                    if (!currentTable || currentTable === 'NO SCHEMA') {
                        continue;
                    }
                    for (const column in modelClass._schema) {
                        const property = modelClass._schema[column];
                        if (!currentTable[property._dbname_us]) {
                            if (options.verbose) {
                                console.log(`Adding column ${column} to ${modelClass.table_name}`);
                            }
                            await this._adapter.addColumn(model, property);
                        }
                    }
                }
                for (const model in this.models) {
                    const modelClass = this.models[model];
                    if (!current.tables[modelClass.table_name]) {
                        if (options.verbose) {
                            console.log(`Creating table ${modelClass.table_name}`);
                        }
                        await this._adapter.createTable(model);
                    }
                }
                for (const model_name in this.models) {
                    const modelClass = this.models[model_name];
                    for (const index of modelClass._indexes) {
                        if (!((_b = (_a = current.indexes) === null || _a === void 0 ? void 0 : _a[modelClass.table_name]) === null || _b === void 0 ? void 0 : _b[index.options.name])) {
                            if (options.verbose) {
                                console.log(`Creating index on ${modelClass.table_name} ${Object.keys(index.columns)}`);
                            }
                            await this._adapter.createIndex(model_name, index);
                        }
                    }
                }
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
                            const current_foreign_key = current.foreign_keys && current.foreign_keys[modelClass.table_name]
                                && current.foreign_keys[modelClass.table_name][integrity.column];
                            if (!(current_foreign_key && current_foreign_key === integrity.parent.table_name)) {
                                if (options.verbose) {
                                    const table_name = modelClass.table_name;
                                    const parent_table_name = integrity.parent.table_name;
                                    console.log(`Adding foreign key ${table_name}.${integrity.column} to ${parent_table_name}`);
                                }
                                await this._adapter.createForeignKey(model, integrity.column, type, integrity.parent);
                            }
                        }
                    }
                }
            }
            finally {
                if (options.verbose) {
                    console.log('Applying schemas done');
                }
                this._applying_schemas = false;
                this._schema_changed = false;
            }
        });
        return this._promise_schema_applied;
    }
    async isApplyingSchemasNecessary() {
        const changes = await this.getSchemaChanges();
        return lodash_1.default.some(changes, (change) => change.ignorable !== true);
    }
    /**
     * Returns changes of schama
     * @see AdapterBase::applySchema
     */
    async getSchemaChanges() {
        var _a, _b, _c;
        this._initializeModels();
        this.applyAssociations();
        this._checkArchive();
        await this._promise_connection;
        const changes = [];
        const current = await this._adapter.getSchemas();
        for (const model in this.models) {
            const modelClass = this.models[model];
            const currentTable = current.tables && current.tables[modelClass.table_name];
            if (!currentTable || currentTable === 'NO SCHEMA') {
                continue;
            }
            for (const column in modelClass._schema) {
                const property = modelClass._schema[column];
                if (!currentTable[property._dbname_us]) {
                    changes.push({ message: `Add column ${column} to ${modelClass.table_name}` });
                }
                else if (column !== 'id') {
                    if (property.required && !currentTable[property._dbname_us].required) {
                        changes.push({ message: `Change ${modelClass.table_name}.${column} to required`, ignorable: true });
                    }
                    else if (!property.required && currentTable[property._dbname_us].required) {
                        changes.push({ message: `Change ${modelClass.table_name}.${column} to optional`, ignorable: true });
                    }
                }
            }
            for (const column in currentTable) {
                if (!lodash_1.default.find(modelClass._schema, { _dbname_us: column })) {
                    changes.push({ message: `Remove column ${column} from ${modelClass.table_name}`, ignorable: true });
                }
            }
        }
        for (const model in this.models) {
            const modelClass = this.models[model];
            if (!current.tables[modelClass.table_name]) {
                changes.push({ message: `Add table ${modelClass.table_name}` });
            }
        }
        for (const table_name in current.tables) {
            if (!lodash_1.default.find(this.models, { table_name })) {
                changes.push({ message: `Remove table ${table_name}`, ignorable: true });
            }
        }
        for (const model_name in this.models) {
            const modelClass = this.models[model_name];
            for (const index of modelClass._indexes) {
                if (!((_b = (_a = current.indexes) === null || _a === void 0 ? void 0 : _a[modelClass.table_name]) === null || _b === void 0 ? void 0 : _b[index.options.name])) {
                    changes.push({ message: `Add index on ${modelClass.table_name} ${Object.keys(index.columns)}` });
                }
            }
            for (const index in (_c = current.indexes) === null || _c === void 0 ? void 0 : _c[modelClass.table_name]) {
                if (!lodash_1.default.find(modelClass._indexes, (item) => item.options.name === index)) {
                    changes.push({ message: `Remove index on ${modelClass.table_name} ${index}`, ignorable: true });
                }
            }
        }
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
                    const current_foreign_key = current.foreign_keys && current.foreign_keys[modelClass.table_name]
                        && current.foreign_keys[modelClass.table_name][integrity.column];
                    if (!(current_foreign_key && current_foreign_key === integrity.parent.table_name)) {
                        const table_name = modelClass.table_name;
                        const parent_table_name = integrity.parent.table_name;
                        changes.push({ message: `Add foreign key ${table_name}.${integrity.column} to ${parent_table_name}` });
                    }
                }
            }
        }
        return changes;
    }
    /**
     * Drops all model tables
     */
    async dropAllModels() {
        for (const model of this._getModelNamesByAssociationOrder()) {
            await this.models[model].drop();
        }
    }
    /**
     * Logs
     */
    log(model, type, data) { }
    [util_1.inspect.custom]() {
        return util_1.inspect(this.models);
    }
    /**
     * Manipulate data
     */
    async manipulate(commands) {
        this.log('<conn>', 'manipulate', commands);
        await this._checkSchemaApplied();
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
                    key = undefined;
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
                const record = await this._manipulateCreate(model, data);
                if (id) {
                    id_to_record_map[id] = record;
                }
            }
            else if (key.substr(0, 7) === 'delete_') {
                const model = key.substr(7);
                await this._manipulateDelete(model, data);
            }
            else if (key === 'deleteAll') {
                await this._manipulateDeleteAllModels();
            }
            else if (key.substr(0, 5) === 'drop_') {
                const model = key.substr(5);
                await this._manipulateDropModel(model);
            }
            else if (key === 'dropAll') {
                await this._manipulateDropAllModels();
            }
            else if (key.substr(0, 5) === 'find_') {
                const model = key.substr(5);
                const id = data.id;
                delete data.id;
                if (!id) {
                    continue;
                }
                const records = await this._manipulateFind(model, data);
                id_to_record_map[id] = records;
            }
            else {
                throw new Error('unknown command: ' + key);
            }
        }
        return id_to_record_map;
    }
    /**
     * Adds an association
     * @see BaseModel.hasMany
     * @see BaseModel.belongsTo
     */
    addAssociation(association) {
        this._pending_associations.push(association);
        this._schema_changed = true;
    }
    /**
     * Returns inconsistent records against associations
     */
    async getInconsistencies() {
        await this._checkSchemaApplied();
        const result = {};
        const promises = Object.keys(this.models).map(async (model) => {
            const modelClass = this.models[model];
            const integrities = modelClass._integrities.filter((integrity) => integrity.type.substr(0, 7) === 'parent_');
            if (integrities.length > 0) {
                let records = await modelClass.select('').exec();
                const ids = records.map((record) => record.id);
                const sub_promises = integrities.map(async (integrity) => {
                    const query = integrity.child.select('');
                    query.where(lodash_1.default.zipObject([integrity.column], [{ $not: { $in: ids } }]));
                    const property = integrity.child._schema[integrity.column];
                    if (!property.required) {
                        query.where(lodash_1.default.zipObject([integrity.column], [{ $not: null }]));
                    }
                    records = await query.exec();
                    if (records.length > 0) {
                        const array = result[integrity.child._name] || (result[integrity.child._name] = []);
                        array.push(...records.map((record) => record.id));
                        lodash_1.default.uniq(array);
                    }
                });
                await Promise.all(sub_promises);
            }
        });
        await Promise.all(promises);
        return result;
    }
    /**
     * Fetches associated records
     */
    async fetchAssociated(records, column, select, options) {
        if ((select != null) && typeof select === 'object') {
            options = select;
            select = undefined;
        }
        else if (options == null) {
            options = {};
        }
        await this._checkSchemaApplied();
        const record = Array.isArray(records) ? records[0] : records;
        if (!record) {
            return;
        }
        let association;
        if (options.model) {
            association = options.model._associations && options.model._associations[column];
        }
        else {
            association = record.constructor._associations && record.constructor._associations[column];
        }
        if (!association) {
            throw new Error(`unknown column '${column}'`);
        }
        if (association.type === 'belongsTo') {
            return await this._fetchAssociatedBelongsTo(records, association.target_model, column, select, options);
        }
        else if (association.type === 'hasMany') {
            return await this._fetchAssociatedHasMany(records, association.target_model, association.foreign_key, column, select, options);
        }
        else {
            throw new Error(`unknown column '${column}'`);
        }
    }
    /**
     * Applies pending associations
     */
    applyAssociations() {
        this._initializeModels();
        for (const item of this._pending_associations) {
            const this_model = item.this_model;
            const options = item.options;
            let target_model;
            if (typeof item.target_model_or_column === 'string') {
                let models;
                if (options && options.connection) {
                    models = options.connection.models;
                }
                else {
                    models = this.models;
                }
                let target_model_name;
                if (options && options.type) {
                    target_model_name = options.type;
                    options.as = item.target_model_or_column;
                }
                else if (item.type === 'belongsTo' || item.type === 'hasOne') {
                    target_model_name = inflector.camelize(item.target_model_or_column);
                }
                else {
                    target_model_name = inflector.classify(item.target_model_or_column);
                }
                if (!models[target_model_name]) {
                    throw new Error(`model ${target_model_name} does not exist`);
                }
                target_model = models[target_model_name];
            }
            else {
                target_model = item.target_model_or_column;
            }
            this['_' + item.type](this_model, target_model, options);
        }
        this._pending_associations = [];
    }
    async getTransaction(options) {
        await this._promise_connection;
        const transaction = new transaction_1.Transaction(this);
        await transaction.setup(options && options.isolation_level);
        return transaction;
    }
    async transaction(options_or_block, block) {
        let options;
        if (typeof options_or_block === 'function') {
            options = {};
            block = options_or_block;
        }
        else {
            options = options_or_block;
            block = block;
        }
        const transaction = new transaction_1.Transaction(this);
        await transaction.setup(options && options.isolation_level);
        try {
            const args = (options.models || []).map((model) => {
                const txModel = function (data) {
                    const instance = new model(data);
                    instance._transaction = transaction;
                    return instance;
                };
                txModel.create = (data) => {
                    return model.create(data, { transaction });
                };
                txModel.createBulk = (data) => {
                    return model.createBulk(data, { transaction });
                };
                txModel.count = (condition) => {
                    return model.count(condition, { transaction });
                };
                txModel.update = (updates, condition) => {
                    return model.update(updates, condition, { transaction });
                };
                txModel.delete = (condition) => {
                    return model.delete(condition, { transaction });
                };
                txModel.query = () => {
                    return model.query({ transaction });
                };
                txModel.find = (id) => {
                    return model.find(id, { transaction });
                };
                txModel.findPreserve = (ids) => {
                    return model.findPreserve(ids, { transaction });
                };
                txModel.where = (condition) => {
                    return model.where(condition, { transaction });
                };
                txModel.select = (columns) => {
                    return model.select(columns, { transaction });
                };
                txModel.order = (orders) => {
                    return model.order(orders, { transaction });
                };
                txModel.group = (group_by, fields) => {
                    return model.group(group_by, fields, { transaction });
                };
                return txModel;
            });
            args.push(transaction);
            const result = await block(...args);
            await transaction.commit();
            return result;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async _checkSchemaApplied() {
        this._initializeModels();
        if (!this._applying_schemas && !this._schema_changed) {
            return;
        }
        if (!this._implicit_apply_schemas) {
            this.applyAssociations();
            return;
        }
        await this.applySchemas();
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
    async _connect(settings) {
        if (!this._adapter) {
            return;
        }
        try {
            await this._adapter.connect(settings);
            this._connected = true;
        }
        catch (error) {
            // try again with delay
            await new Promise((resolve) => {
                setTimeout(() => resolve(), 5000);
            });
            console.log('try again to connect', error.toString());
            await this._connect(settings);
        }
    }
    _initializeModels() {
        for (const model in this.models) {
            const modelClass = this.models[model];
            if (modelClass.initialize && !modelClass._initialize_called) {
                modelClass.initialize();
                modelClass._initialize_called = true;
            }
            modelClass._completeSchema();
        }
    }
    _checkArchive() {
        for (const model in this.models) {
            const modelClass = this.models[model];
            if (modelClass.archive && !Object.prototype.hasOwnProperty.call(modelClass._connection.models, '_Archive')) {
                // eslint-disable-next-line @typescript-eslint/class-name-casing
                const _Archive = class extends model_1.BaseModel {
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
        for (const model in this.models) {
            const modelClass = this.models[model];
            t.add(model, []);
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
    async _manipulateCreate(model, data) {
        model = inflector.camelize(model);
        if (!this.models[model]) {
            throw new Error(`model ${model} does not exist`);
        }
        return await this.models[model].create(data, { skip_log: true });
    }
    async _manipulateDelete(model, data) {
        model = inflector.camelize(model);
        if (!this.models[model]) {
            throw new Error(`model ${model} does not exist`);
        }
        await this.models[model].where(data).delete({ skip_log: true });
    }
    async _manipulateDeleteAllModels() {
        for (const model of Object.keys(this.models)) {
            if (model === '_Archive') {
                return;
            }
            await this.models[model].where().delete({ skip_log: true });
        }
    }
    async _manipulateDropModel(model) {
        model = inflector.camelize(model);
        if (!this.models[model]) {
            throw new Error(`model ${model} does not exist`);
        }
        await this.models[model].drop();
    }
    async _manipulateDropAllModels() {
        await this.dropAllModels();
    }
    async _manipulateFind(model, data) {
        model = inflector.camelize(inflector.singularize(model));
        if (!this.models[model]) {
            throw new Error(`model ${model} does not exist`);
        }
        return await this.models[model].where(data).exec({ skip_log: true });
    }
    _manipulateConvertIds(id_to_record_map, model, data) {
        model = inflector.camelize(model);
        if (!this.models[model]) {
            return;
        }
        for (const column in this.models[model]._schema) {
            const property = this.models[model]._schema[column];
            if (property.record_id && Object.prototype.hasOwnProperty.call(data, column)) {
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
     * Adds a has-many association
     */
    _hasMany(this_model, target_model, options) {
        let foreign_key;
        if (options && options.foreign_key) {
            foreign_key = options.foreign_key;
        }
        else if (options && options.as) {
            foreign_key = options.as + '_id';
        }
        else {
            foreign_key = inflector.foreign_key(this_model._name);
        }
        target_model.column(foreign_key, {
            connection: this_model._connection,
            type: types.RecordID,
        });
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
                if (!Object.prototype.hasOwnProperty.call(this, columnGetter)) {
                    getter = async (reload) => {
                        // this is getter.__scope in normal case (this_model_instance.target_model_name()),
                        // but use getter.__scope for safety
                        const self = getter.__scope;
                        if ((!self[columnCache] || reload) && self.id) {
                            const records = await target_model.where(lodash_1.default.zipObject([foreign_key], [self.id]));
                            self[columnCache] = records;
                            return records;
                        }
                        else {
                            return self[columnCache] || [];
                        }
                    };
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
        if (options && options.foreign_key) {
            foreign_key = options.foreign_key;
        }
        else if (options && options.as) {
            foreign_key = options.as + '_id';
        }
        else {
            foreign_key = inflector.foreign_key(this_model._name);
        }
        target_model.column(foreign_key, {
            connection: this_model._connection,
            type: types.RecordID,
        });
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
                if (!Object.prototype.hasOwnProperty.call(this, columnGetter)) {
                    getter = async (reload) => {
                        // this is getter.__scope in normal case (this_model_instance.target_model_name()),
                        // but use getter.__scope for safety
                        const self = getter.__scope;
                        if ((!self[columnCache] || reload) && self.id) {
                            const records = await target_model.where(lodash_1.default.zipObject([foreign_key], [self.id]));
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
     * Adds a belongs-to association
     */
    _belongsTo(this_model, target_model, options) {
        let foreign_key;
        if (options && options.foreign_key) {
            foreign_key = options.foreign_key;
        }
        else if (options && options.as) {
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
                if (!Object.prototype.hasOwnProperty.call(this, columnGetter)) {
                    getter = async (reload) => {
                        // this is getter.__scope in normal case (this_model_instance.target_model_name()),
                        // but use getter.__scope for safety
                        const self = getter.__scope;
                        if ((!self[columnCache] || reload) && self[foreign_key]) {
                            const record = await target_model.find(self[foreign_key]);
                            self[columnCache] = record;
                            return record;
                        }
                        else {
                            return self[columnCache];
                        }
                    };
                    getter.__scope = this;
                    Object.defineProperty(this, columnCache, { value: null, writable: true });
                    Object.defineProperty(this, columnGetter, { value: getter });
                }
                return this[columnGetter];
            },
        });
    }
    async _fetchAssociatedBelongsTo(records, target_model, column, select, options) {
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
            if (options.transaction) {
                query.transaction(options.transaction);
            }
            if (select) {
                query.select(select);
            }
            if (options.lean) {
                query.lean();
            }
            try {
                const sub_records = await query.exec();
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
                    if (!Object.prototype.hasOwnProperty.call(record, column)) {
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
                if (options.transaction) {
                    query.transaction(options.transaction);
                }
                if (select) {
                    query.select(select);
                }
                if (options.lean) {
                    query.lean();
                }
                try {
                    const sub_record = await query.exec();
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
                    if (!Object.prototype.hasOwnProperty.call(records, column)) {
                        if (options.lean) {
                            records[column] = null;
                        }
                        else {
                            Object.defineProperty(records, column, { enumerable: true, value: null });
                        }
                    }
                }
            }
            else if (!Object.prototype.hasOwnProperty.call(records, column)) {
                if (options.lean) {
                    records[column] = null;
                }
                else {
                    Object.defineProperty(records, column, { enumerable: true, value: null });
                }
            }
        }
    }
    async _fetchAssociatedHasMany(records, target_model, foreign_key, column, select, options) {
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
            const query = target_model.where(lodash_1.default.zipObject([foreign_key], [{ $in: ids }]));
            if (options.transaction) {
                query.transaction(options.transaction);
            }
            if (select) {
                query.select(select + ' ' + foreign_key);
            }
            if (options.lean) {
                query.lean();
            }
            try {
                const sub_records = await query.exec();
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
            const query = target_model.where(lodash_1.default.zipObject([foreign_key], [records.id]));
            if (options.transaction) {
                query.transaction(options.transaction);
            }
            if (select) {
                query.select(select + ' ' + foreign_key);
            }
            if (options.lean) {
                query.lean();
            }
            try {
                const sub_records = await query.exec();
                sub_records.forEach((sub_record) => {
                    return records[column].push(sub_record);
                });
            }
            catch (error) {
                //
            }
        }
    }
}
exports.Connection = Connection;
class MongoDBConnection extends Connection {
    constructor(settings) {
        super(mongodb_1.createAdapter, settings);
    }
}
exports.MongoDBConnection = MongoDBConnection;
class MySQLConnection extends Connection {
    constructor(settings) {
        super(mysql_1.createAdapter, settings);
    }
}
exports.MySQLConnection = MySQLConnection;
class PostgreSQLConnection extends Connection {
    constructor(settings) {
        super(postgresql_1.createAdapter, settings);
    }
}
exports.PostgreSQLConnection = PostgreSQLConnection;
class SQLite3Connection extends Connection {
    constructor(settings) {
        super(sqlite3_1.createAdapter, settings);
    }
}
exports.SQLite3Connection = SQLite3Connection;
