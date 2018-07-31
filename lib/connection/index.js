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
const Toposort = require("toposort-class");
const util_1 = require("util");
const model_1 = require("../model");
const association_1 = require("./association");
const manipulate_1 = require("./manipulate");
try {
    // tslint:disable-next-line:no-var-requires
    redis = require('redis');
}
catch (error) {
    /**/
}
/**
 * Manages connection to a database
 * @uses ConnectionAssociation
 * @uses ConnectionManipulate
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
                var add_columns_commands, args, column, current, current_foreign_key, foreign_keys_commands, i, index, indexes_commands, integrity, j, k, len, len1, len2, model, modelClass, property, ref, ref1, ref10, ref11, ref12, ref13, ref14, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, results, tables_commands, type;
                try {
                    current = (yield this._adapter.getSchemas());
                    add_columns_commands = [];
                    ref = this.models;
                    for (model in ref) {
                        modelClass = ref[model];
                        if (!((ref1 = current.tables) != null ? ref1[modelClass.tableName] : void 0) || ((ref2 = current.tables) != null ? ref2[modelClass.tableName] : void 0) === 'NO SCHEMA') {
                            continue;
                        }
                        ref3 = modelClass._schema;
                        for (column in ref3) {
                            property = ref3[column];
                            if (!((ref4 = current.tables) != null ? (ref5 = ref4[modelClass.tableName]) != null ? ref5[property._dbname] : void 0 : void 0)) {
                                if (options.verbose) {
                                    console.log(`Adding column ${column} to ${modelClass.tableName}`);
                                }
                                add_columns_commands.push(this._adapter.addColumn(model, property));
                            }
                        }
                    }
                    yield Promise.all(add_columns_commands);
                    tables_commands = [];
                    ref6 = this.models;
                    for (model in ref6) {
                        modelClass = ref6[model];
                        if (!current.tables[modelClass.tableName]) {
                            if (options.verbose) {
                                console.log(`Creating table ${modelClass.tableName}`);
                            }
                            tables_commands.push(this._adapter.createTable(model));
                        }
                    }
                    yield Promise.all(tables_commands);
                    indexes_commands = [];
                    ref7 = this.models;
                    for (model in ref7) {
                        modelClass = ref7[model];
                        ref8 = modelClass._indexes;
                        for (i = 0, len = ref8.length; i < len; i++) {
                            index = ref8[i];
                            if (!((ref9 = current.indexes) != null ? (ref10 = ref9[modelClass.tableName]) != null ? ref10[index.options.name] : void 0 : void 0)) {
                                if (options.verbose) {
                                    console.log(`Creating index on ${modelClass.tableName} ${Object.keys(index.columns)}`);
                                }
                                indexes_commands.push(this._adapter.createIndex(model, index));
                            }
                        }
                    }
                    yield Promise.all(indexes_commands);
                    foreign_keys_commands = [];
                    ref11 = this.models;
                    for (model in ref11) {
                        modelClass = ref11[model];
                        ref12 = modelClass._integrities;
                        for (j = 0, len1 = ref12.length; j < len1; j++) {
                            integrity = ref12[j];
                            type = '';
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
                                current_foreign_key = (ref13 = current.foreign_keys) != null ? (ref14 = ref13[modelClass.tableName]) != null ? ref14[integrity.column] : void 0 : void 0;
                                if (!(current_foreign_key && current_foreign_key === integrity.parent.tableName)) {
                                    if (options.verbose) {
                                        console.log(`Adding foreign key ${modelClass.tableName}.${integrity.column} to ${integrity.parent.tableName}`);
                                    }
                                    foreign_keys_commands.push([model, integrity.column, type, integrity.parent]);
                                }
                            }
                        }
                    }
                    results = [];
                    for (k = 0, len2 = foreign_keys_commands.length; k < len2; k++) {
                        args = foreign_keys_commands[k];
                        results.push((yield this._adapter.createForeignKey.apply(this._adapter, args)));
                    }
                    return results;
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
    addAssociation() { }
    getInconsistencies() { }
    fetchAssociated() { }
    manipulate() { }
    _checkSchemaApplied() {
        return __awaiter(this, void 0, void 0, function* () {
            this._initializeModels();
            if (!this._applying_schemas && !this._schema_changed) {
                return;
            }
            return yield this.applySchemas();
        });
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
    _connectRedisCache() {
        var client, settings;
        if (this._redis_cache_client) {
            return this._redis_cache_client;
        }
        else if (!redis) {
            throw new Error('cache needs Redis');
        }
        else {
            settings = this._redis_cache_settings;
            this._redis_cache_client = client = settings.client || (redis.createClient(settings.port || 6379, settings.host || '127.0.0.1'));
            if (settings.database != null) {
                client.select(settings.database);
                client.once('connect', function () {
                    client.send_anyways = true;
                    client.select(settings.database);
                    return client.send_anyways = false;
                });
            }
            return client;
        }
    }
}
exports.Connection = Connection;
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
applyMixins(Connection, [association_1.ConnectionAssociation, manipulate_1.ConnectionManipulate]);
