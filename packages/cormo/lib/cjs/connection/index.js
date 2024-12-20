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
exports.Connection = exports.SQLite3Connection = exports.PostgreSQLConnection = exports.MySQLConnection = exports.MongoDBConnection = void 0;
const events_1 = require("events");
const util_1 = require("util");
const lodash_1 = __importDefault(require("lodash"));
const mongodb_js_1 = require("../adapters/mongodb.js");
const mysql_js_1 = require("../adapters/mysql.js");
const postgresql_js_1 = require("../adapters/postgresql.js");
const redis_js_1 = require("../adapters/redis.js");
const sqlite3_js_1 = require("../adapters/sqlite3.js");
const sqlite3_memory_js_1 = require("../adapters/sqlite3_memory.js");
const index_js_1 = require("../logger/index.js");
const index_js_2 = require("../model/index.js");
const transaction_js_1 = require("../transaction.js");
const types = __importStar(require("../types.js"));
const inflector = __importStar(require("../util/inflector.js"));
const adapter_creaters = {
    mongodb: mongodb_js_1.createAdapter,
    mysql: mysql_js_1.createAdapter,
    postgresql: postgresql_js_1.createAdapter,
    redis: redis_js_1.createAdapter,
    sqlite3: sqlite3_js_1.createAdapter,
    sqlite3_memory: sqlite3_memory_js_1.createAdapter,
};
let Toposort;
// @ts-expect-error no type definitions
Promise.resolve().then(() => __importStar(require('toposort-class'))).then((m) => {
    Toposort = m.default;
});
let redis;
try {
    Promise.resolve().then(() => __importStar(require('ioredis'))).then((m) => {
        redis = m.default;
    });
}
catch {
    /**/
}
/**
 * Manages connection to a database
 */
class Connection extends events_1.EventEmitter {
    get adapter() {
        return this._adapter;
    }
    constructor(adapter, settings) {
        super();
        /** @internal */
        this._schema_changed = false;
        /** @internal */
        this._connected = false;
        /** @internal */
        this._applying_schemas = false;
        /** @internal */
        this._implicit_apply_schemas = false;
        /** @internal */
        this._connection_retry_count = 99999;
        if (settings.is_default !== false) {
            Connection.defaultConnection = this;
        }
        this._implicit_apply_schemas = settings.implicit_apply_schemas ?? false;
        this._connection_retry_count = settings.connection_retry_count ?? 99999;
        const redis_cache = settings.redis_cache || {};
        this._redis_cache_settings = redis_cache;
        this.models = {};
        this._pending_associations = [];
        if (typeof adapter === 'string') {
            this._adapter = adapter_creaters[adapter](this);
        }
        else {
            this._adapter = adapter(this);
        }
        this._promise_connection = this._connect(settings);
        this.setLogger(settings.logger);
    }
    /**
     * Set logger
     */
    setLogger(logger) {
        if (logger) {
            if (logger === 'console') {
                this._logger = new index_js_1.ConsoleLogger();
            }
            else if (logger === 'color-console') {
                this._logger = new index_js_1.ColorConsoleLogger();
            }
            else if (logger === 'empty') {
                this._logger = new index_js_1.EmptyLogger();
            }
            else {
                this._logger = logger;
            }
        }
        else {
            this._logger = new index_js_1.EmptyLogger();
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
        return index_js_2.BaseModel.newModel(this, name, schema);
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
            try {
                const current = await this._adapter.getSchemas();
                for (const model in this.models) {
                    const model_class = this.models[model];
                    if (!model_class) {
                        continue;
                    }
                    const current_table = current.tables[model_class.table_name];
                    if (!current_table || current_table === 'NO SCHEMA') {
                        continue;
                    }
                    for (const column in model_class._schema) {
                        const property = model_class._schema[column];
                        if (!property) {
                            continue;
                        }
                        const current_column = current_table.columns[property._dbname_us];
                        if (!current_column) {
                            if (options.verbose) {
                                console.log(`Adding column ${property._dbname_us} to ${model_class.table_name}`);
                            }
                            await this._adapter.addColumn(model, property, options.verbose);
                            continue;
                        }
                        let type_changed = false;
                        if (column !== 'id') {
                            if (property.required && !current_column.required) {
                                type_changed = true;
                            }
                            else if (!property.required && current_column.required) {
                                type_changed = true;
                            }
                        }
                        const expected_type = this._adapter.getAdapterTypeString(property);
                        const real_type = current_column.adapter_type_string;
                        if (expected_type !== real_type) {
                            type_changed = true;
                        }
                        if ((current_column.description ?? '') !== (property.description ?? '')) {
                            if (!type_changed) {
                                if (options.apply_description_change) {
                                    if (options.verbose) {
                                        console.log(`Changing ${model_class.table_name}.${column}'s description to '${property.description}'`);
                                    }
                                    await this._adapter.updateColumnDescription(model, property, options.verbose);
                                }
                            }
                            else {
                                // do not update description to prevent unexpected type change
                            }
                        }
                    }
                }
                for (const model in this.models) {
                    const model_class = this.models[model];
                    if (!model_class) {
                        continue;
                    }
                    const current_table = current.tables[model_class.table_name];
                    if (!current_table) {
                        if (options.verbose) {
                            console.log(`Creating table ${model_class.table_name}`);
                        }
                        await this._adapter.createTable(model, options.verbose);
                    }
                    else if (current_table !== 'NO SCHEMA' &&
                        (current_table.description ?? '') !== (model_class.description ?? '')) {
                        if (options.apply_description_change) {
                            if (options.verbose) {
                                console.log(`Changing table ${model_class.table_name}'s description to '${model_class.description}'`);
                            }
                            await this._adapter.updateTableDescription(model, options.verbose);
                        }
                    }
                }
                for (const model_name in this.models) {
                    const model_class = this.models[model_name];
                    if (!model_class) {
                        continue;
                    }
                    for (const index of model_class._indexes) {
                        if (!current.indexes?.[model_class.table_name]?.[index.options.name ?? '']) {
                            if (options.verbose) {
                                console.log(`Creating index on ${model_class.table_name} ${Object.keys(index.columns)}`);
                            }
                            await this._adapter.createIndex(model_name, index, options.verbose);
                        }
                    }
                }
                for (const model in this.models) {
                    const model_class = this.models[model];
                    if (!model_class) {
                        continue;
                    }
                    for (const integrity of model_class._integrities) {
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
                            const current_foreign_key = current.foreign_keys &&
                                current.foreign_keys[model_class.table_name] &&
                                current.foreign_keys[model_class.table_name][integrity.column];
                            if (!(current_foreign_key && current_foreign_key === integrity.parent.table_name)) {
                                if (options.verbose) {
                                    const table_name = model_class.table_name;
                                    const parent_table_name = integrity.parent.table_name;
                                    console.log(`Adding foreign key ${table_name}.${integrity.column} to ${parent_table_name}`);
                                }
                                await this._adapter.createForeignKey(model, integrity.column, type, integrity.parent, options.verbose);
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
        this._initializeModels();
        this.applyAssociations();
        this._checkArchive();
        await this._promise_connection;
        const changes = [];
        const current = await this._adapter.getSchemas();
        for (const model in this.models) {
            const model_class = this.models[model];
            if (!model_class) {
                continue;
            }
            const current_table = current.tables[model_class.table_name];
            if (!current_table || current_table === 'NO SCHEMA') {
                continue;
            }
            for (const column in model_class._schema) {
                const property = model_class._schema[column];
                if (!property) {
                    continue;
                }
                const current_column = current_table.columns[property._dbname_us];
                if (!current_column) {
                    changes.push({ message: `Add column ${property._dbname_us} to ${model_class.table_name}` });
                    const query = this._adapter.getAddColumnQuery(model, property);
                    if (query) {
                        changes.push({ message: `  (${query})`, is_query: true, ignorable: true });
                    }
                    continue;
                }
                let type_changed = false;
                if (column !== 'id') {
                    if (property.required && !current_column.required) {
                        type_changed = true;
                        changes.push({
                            message: `Change ${model_class.table_name}.${property._dbname_us} to required`,
                            ignorable: true,
                        });
                    }
                    else if (!property.required && current_column.required) {
                        type_changed = true;
                        changes.push({ message: `Change ${model_class.table_name}.${column} to optional`, ignorable: true });
                    }
                }
                const expected_type = this._adapter.getAdapterTypeString(property);
                const real_type = current_column.adapter_type_string;
                if (expected_type !== real_type) {
                    type_changed = true;
                    changes.push({
                        message: `Type different ${model_class.table_name}.${column}: expected=${expected_type}, real=${real_type}`,
                        ignorable: true,
                    });
                }
                if ((current_column.description ?? '') !== (property.description ?? '')) {
                    if (!type_changed) {
                        changes.push({
                            message: `Change ${model_class.table_name}.${column}'s description to '${property.description}'`,
                            ignorable: true,
                        });
                        const query = this._adapter.getUpdateColumnDescriptionQuery(model, property);
                        if (query) {
                            changes.push({ message: `  (${query})`, is_query: true, ignorable: true });
                        }
                    }
                    else {
                        changes.push({
                            message: `(Skip) Change ${model_class.table_name}.${column}'s description to '${property.description}'`,
                            ignorable: true,
                        });
                    }
                }
            }
            for (const column in current_table.columns) {
                if (!lodash_1.default.find(model_class._schema, { _dbname_us: column })) {
                    changes.push({ message: `Remove column ${column} from ${model_class.table_name}`, ignorable: true });
                }
            }
        }
        for (const model in this.models) {
            const model_class = this.models[model];
            if (!model_class) {
                continue;
            }
            const current_table = current.tables[model_class.table_name];
            if (!current_table) {
                changes.push({ message: `Add table ${model_class.table_name}` });
                const query = this._adapter.getCreateTableQuery(model);
                if (query) {
                    changes.push({ message: `  (${query})`, is_query: true, ignorable: true });
                }
            }
            else if (current_table !== 'NO SCHEMA' &&
                (current_table.description ?? '') !== (model_class.description ?? '')) {
                changes.push({
                    message: `Change table ${model_class.table_name}'s description to '${model_class.description}'`,
                    ignorable: true,
                });
                const query = this._adapter.getUpdateTableDescriptionQuery(model);
                if (query) {
                    changes.push({ message: `  (${query})`, is_query: true, ignorable: true });
                }
            }
        }
        for (const table_name in current.tables) {
            if (!lodash_1.default.find(this.models, { table_name })) {
                changes.push({ message: `Remove table ${table_name}`, ignorable: true });
            }
        }
        for (const model_name in this.models) {
            const model_class = this.models[model_name];
            if (!model_class) {
                continue;
            }
            for (const index of model_class._indexes) {
                if (!current.indexes?.[model_class.table_name]?.[index.options.name ?? '']) {
                    changes.push({ message: `Add index on ${model_class.table_name} ${Object.keys(index.columns)}` });
                    const query = this._adapter.getCreateIndexQuery(model_name, index);
                    if (query) {
                        changes.push({ message: `  (${query})`, is_query: true, ignorable: true });
                    }
                }
            }
            for (const index in current.indexes?.[model_class.table_name]) {
                // MySQL add index for foreign key, so does not need to remove if the index is defined in integrities
                if (!lodash_1.default.find(model_class._indexes, (item) => item.options.name === index) &&
                    !lodash_1.default.find(model_class._integrities, (item) => item.column === index)) {
                    changes.push({ message: `Remove index on ${model_class.table_name} ${index}`, ignorable: true });
                }
            }
        }
        for (const model in this.models) {
            const model_class = this.models[model];
            if (!model_class) {
                continue;
            }
            for (const integrity of model_class._integrities) {
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
                    const current_foreign_key = current.foreign_keys &&
                        current.foreign_keys[model_class.table_name] &&
                        current.foreign_keys[model_class.table_name][integrity.column];
                    if (!(current_foreign_key && current_foreign_key === integrity.parent.table_name) &&
                        this._adapter.native_integrity) {
                        const table_name = model_class.table_name;
                        const parent_table_name = integrity.parent.table_name;
                        changes.push({ message: `Add foreign key ${table_name}.${integrity.column} to ${parent_table_name}` });
                        const query = this._adapter.getCreateForeignKeyQuery(model, integrity.column, type, integrity.parent);
                        if (query) {
                            changes.push({ message: `  (${query})`, is_query: true, ignorable: true });
                        }
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
        for (const model_name of this._getModelNamesByAssociationOrder()) {
            await this.models[model_name]?.drop();
        }
    }
    /**
     * Logs
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    log(model_name, type, data) {
        /**/
    }
    [util_1.inspect.custom]() {
        return (0, util_1.inspect)(this.models);
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
                const model_name = key.substr(7);
                const id = data.id;
                delete data.id;
                this._manipulateConvertIds(id_to_record_map, model_name, data);
                const record = await this._manipulateCreate(model_name, data);
                if (id) {
                    id_to_record_map[id] = record;
                }
            }
            else if (key.substr(0, 7) === 'delete_') {
                const model_name = key.substr(7);
                await this._manipulateDelete(model_name, data);
            }
            else if (key === 'deleteAll') {
                await this._manipulateDeleteAllModels();
            }
            else if (key.substr(0, 5) === 'drop_') {
                const model_name = key.substr(5);
                await this._manipulateDropModel(model_name);
            }
            else if (key === 'dropAll') {
                await this._manipulateDropAllModels();
            }
            else if (key.substr(0, 5) === 'find_') {
                const model_name = key.substr(5);
                const id = data.id;
                delete data.id;
                if (!id) {
                    continue;
                }
                const records = await this._manipulateFind(model_name, data);
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
        const promises = Object.keys(this.models).map(async (model_name) => {
            const model_class = this.models[model_name];
            if (!model_class) {
                return;
            }
            const integrities = model_class._integrities.filter((integrity) => integrity.type.substr(0, 7) === 'parent_');
            if (integrities.length > 0) {
                let records = await model_class.select('').exec();
                const ids = records.map((record) => record.id);
                const sub_promises = integrities.map(async (integrity) => {
                    const query = integrity.child.select('');
                    query.where(lodash_1.default.zipObject([integrity.column], [{ $not: { $in: ids } }]));
                    const property = integrity.child._schema[integrity.column];
                    if (!property?.required) {
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
        if (select != null && typeof select === 'object') {
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
            association = options.model._associations[column];
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
                const model = models[target_model_name];
                if (!model) {
                    throw new Error(`model ${target_model_name} does not exist`);
                }
                target_model = model;
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
        const transaction = new transaction_js_1.Transaction(this);
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
        }
        const transaction = new transaction_js_1.Transaction(this);
        await transaction.setup(options.isolation_level);
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
            const client = settings.client || redis.createClient(settings.port || 6379, settings.host || '127.0.0.1');
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
    async _connect(settings, count = 0) {
        try {
            await this._adapter.connect(settings);
            this._connected = true;
        }
        catch (error) {
            if (this._connection_retry_count && this._connection_retry_count <= count) {
                throw new Error('failed to connect');
            }
            // try again with delay
            await new Promise((resolve) => {
                setTimeout(() => resolve(), 5000 * (count + 1));
            });
            console.log('try again to connect', error.cause ? error.cause.toString() : error.toString());
            await this._connect(settings, count + 1);
        }
    }
    _initializeModels() {
        for (const model_name in this.models) {
            const model_class = this.models[model_name];
            if (!model_class) {
                continue;
            }
            if (!model_class._initialize_called) {
                model_class.initialize();
                model_class._initialize_called = true;
            }
            model_class._completeSchema();
        }
    }
    _checkArchive() {
        for (const model_name in this.models) {
            const model_class = this.models[model_name];
            if (!model_class) {
                continue;
            }
            if (model_class.archive && !Object.prototype.hasOwnProperty.call(model_class._connection.models, '_Archive')) {
                const _Archive = class extends index_js_2.BaseModel {
                };
                _Archive.connection(model_class._connection);
                _Archive.archive = false;
                _Archive.column('model', String);
                _Archive.column('data', Object);
            }
        }
    }
    _getModelNamesByAssociationOrder() {
        const t = new Toposort();
        for (const model_name in this.models) {
            const model_class = this.models[model_name];
            if (!model_class) {
                continue;
            }
            t.add(model_name, []);
            for (const name in model_class._associations) {
                const association = model_class._associations[name];
                // ignore association with models of other connection
                if (association.target_model._connection !== this) {
                    continue;
                }
                // ignore self association
                if (association.target_model === model_class) {
                    continue;
                }
                const type = association.type;
                if (type === 'hasMany' || type === 'hasOne') {
                    t.add(association.target_model._name, model_name);
                }
                else if (type === 'belongsTo') {
                    t.add(model_name, association.target_model._name);
                }
            }
        }
        return t.sort();
    }
    async _manipulateCreate(model_name, data) {
        model_name = inflector.camelize(model_name);
        const model_class = this.models[model_name];
        if (!model_class) {
            throw new Error(`model ${model_name} does not exist`);
        }
        return await model_class.create(data, { skip_log: true });
    }
    async _manipulateDelete(model_name, data) {
        model_name = inflector.camelize(model_name);
        const model_class = this.models[model_name];
        if (!model_class) {
            throw new Error(`model ${model_name} does not exist`);
        }
        await model_class.where(data).delete({ skip_log: true });
    }
    async _manipulateDeleteAllModels() {
        const model_list = Object.keys(this.models).filter((key) => key !== '_Archive');
        try {
            await this.adapter.deleteAllIgnoringConstraint(model_list);
        }
        catch (error) {
            if (error.message === 'not implemented') {
                await Promise.all(model_list.map((model_name) => this.models[model_name]?.where().delete({ skip_log: true })));
                return;
            }
            throw error;
        }
    }
    async _manipulateDropModel(model_name) {
        model_name = inflector.camelize(model_name);
        const model_class = this.models[model_name];
        if (!model_class) {
            throw new Error(`model ${model_name} does not exist`);
        }
        await model_class.drop();
    }
    async _manipulateDropAllModels() {
        await this.dropAllModels();
    }
    async _manipulateFind(model_name, data) {
        model_name = inflector.camelize(inflector.singularize(model_name));
        const model_class = this.models[model_name];
        if (!model_class) {
            throw new Error(`model ${model_name} does not exist`);
        }
        return await model_class.where(data).exec({ skip_log: true });
    }
    _manipulateConvertIds(id_to_record_map, model_name, data) {
        model_name = inflector.camelize(model_name);
        const model_class = this.models[model_name];
        if (!model_class) {
            return;
        }
        for (const column in model_class._schema) {
            const property = model_class._schema[column];
            if (property && property.record_id && Object.prototype.hasOwnProperty.call(data, column)) {
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
        const integrity = (options && options.integrity) || 'ignore';
        target_model._integrities.push({ type: 'child_' + integrity, column: foreign_key, parent: this_model });
        this_model._integrities.push({ type: 'parent_' + integrity, column: foreign_key, child: target_model });
        const column = (options && options.as) || inflector.tableize(target_model._name);
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
        const integrity = (options && options.integrity) || 'ignore';
        target_model._integrities.push({ type: 'child_' + integrity, column: foreign_key, parent: this_model });
        this_model._integrities.push({ type: 'parent_' + integrity, column: foreign_key, child: target_model });
        const column = (options && options.as) || inflector.underscore(target_model._name);
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
        const column = (options && options.as) || inflector.underscore(target_model._name);
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
            catch {
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
            catch {
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
            catch {
                //
            }
        }
    }
}
exports.Connection = Connection;
class MongoDBConnection extends Connection {
    constructor(settings) {
        super(mongodb_js_1.createAdapter, settings);
    }
}
exports.MongoDBConnection = MongoDBConnection;
class MySQLConnection extends Connection {
    constructor(settings) {
        super(mysql_js_1.createAdapter, settings);
    }
}
exports.MySQLConnection = MySQLConnection;
class PostgreSQLConnection extends Connection {
    constructor(settings) {
        super(postgresql_js_1.createAdapter, settings);
    }
}
exports.PostgreSQLConnection = PostgreSQLConnection;
class SQLite3Connection extends Connection {
    constructor(settings) {
        super(sqlite3_js_1.createAdapter, settings);
    }
}
exports.SQLite3Connection = SQLite3Connection;
