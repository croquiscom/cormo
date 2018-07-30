var redis;

import { EventEmitter } from 'events';
import * as Toposort from 'toposort-class';
import { inspect } from 'util';
import { Model } from '../model';

import { ConnectionAssociation } from './association';
import { ConnectionManipulate } from './manipulate';
import { AdapterBase } from '../adapters/base';

try {
  redis = require('redis');
} catch (error) { }

/**
 * Manages connection to a database
 * @uses ConnectionAssociation
 * @uses ConnectionManipulate
 */
class Connection extends EventEmitter implements ConnectionAssociation, ConnectionManipulate {
  //#
  // Default connection
  // @property defaultConnection
  // @type Connection
  // @static
  // @see Connection::constructor

  /**
   * Indicates the adapter associated to this connection
   * @private
   * @see Connection::constructor
   */
  public _adapter: AdapterBase;

  //#
  // Model lists using this connection.
  // Maps from model name to model class
  // @property models
  // @type StringMap<Class<Model>>
  // @see Connection::constructor

  //#
  // Creates a connection
  // @param {String} adapater_name
  // @param {Object} settings connection settings & adapter specific settings
  // @param {Boolean} [settings.is_default=true] Connection.defaultConnection will be set to this if true
  // @param {Object} [settings.redis_cache] Redis server settings to cache
  // @param {RedisClient} [settings.redis_cache.client] Use this client instead of creating one
  // @param {String} [settings.redis_cache.host='127.0.0.1']
  // @param {Number} [settings.redis_cache.port=6379]
  // @param {Number} [settings.redis_cache.database=0]
  // @see MySQLAdapter::connect
  // @see MongoDBAdapter::connect
  // @see PostgreSQLAdapter::connect
  // @see SQLite3Adapter::connect
  // @see RedisAdapter::connect
  constructor(adapter_name, settings) {
    var redis_cache;
    super();
    if (settings.is_default !== false) {
      Connection.defaultConnection = this;
    }
    redis_cache = settings.redis_cache || {};
    this._redis_cache_settings = redis_cache;
    this.connected = false;
    this.models = {};
    this._pending_associations = [];
    this._schema_changed = false;
    this._adapter = require(__dirname + '/../adapters/' + adapter_name).default(this);
    this._promise_connection = this._adapter.connect(settings).then(() => {
      return this.connected = true;
    }).catch((error) => {
      this._adapter = null;
      return console.log('fail to connect', error);
    });
    Object.defineProperty(this, 'adapter', {
      get: function() {
        return this._adapter;
      }
    });
  }

  //#
  // Closes this connection.
  // A closed connection can be used no more.
  close() {
    if (Connection.defaultConnection === this) {
      Connection.defaultConnection = null;
    }
    this._adapter.close();
    return this._adapter = null;
  }

  //#
  // Creates a model class
  // @param {String} name
  // @param {Object} schema
  // @return {Class<Model>}
  model(name, schema) {
    return Model.newModel(this, name, schema);
  }

  async _checkSchemaApplied() {
    this._initializeModels();
    if (!this._applying_schemas && !this._schema_changed) {
      return;
    }
    return (await this.applySchemas());
  }

  _initializeModels() {
    var model, modelClass, ref;
    ref = this.models;
    for (model in ref) {
      modelClass = ref[model];
      if (modelClass.initialize && !modelClass._initialize_called) {
        modelClass.initialize();
        modelClass._initialize_called = true;
      }
    }
  }

  _checkArchive() {
    var _Archive, model, modelClass, ref;
    ref = this.models;
    for (model in ref) {
      modelClass = ref[model];
      if (modelClass.archive && !modelClass._connection.models.hasOwnProperty('_Archive')) {
        _Archive = (function() {
          class _Archive extends Model { };

          _Archive.connection(modelClass._connection);

          _Archive.archive = false;

          _Archive.column('model', String);

          _Archive.column('data', Object);

          return _Archive;

        }).call(this);
      }
    }
  }

  _getModelNamesByAssociationOrder() {
    var association, model, modelClass, name, ref, ref1, ref2, t;
    t = new Toposort();
    ref = this.models;
    for (model in ref) {
      modelClass = ref[model];
      t.add(model, []);
      ref1 = modelClass._associations;
      for (name in ref1) {
        association = ref1[name];
        // ignore association with models of other connection
        if (association.target_model._connection !== this) {
          continue;
        }
        // ignore self association
        if (association.target_model === modelClass) {
          continue;
        }
        if ((ref2 = association.type) === 'hasMany' || ref2 === 'hasOne') {
          t.add(association.target_model._name, model);
        } else if (association.type === 'belongsTo') {
          t.add(model, association.target_model._name);
        }
      }
    }
    return t.sort();
  }

  //#
  // Applies schemas
  // @param {Object} [options]
  // @param {Boolean} [options.verbose=false]
  // @promise
  // @see AdapterBase::applySchema
  applySchemas(options) {
    if (!options) {
      options = {};
    }
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
    this._promise_schema_applied = this._promise_connection.then(async () => {
      var add_columns_commands, args, column, current, current_foreign_key, foreign_keys_commands, i, index, indexes_commands, integrity, j, k, len, len1, len2, model, modelClass, property, ref, ref1, ref10, ref11, ref12, ref13, ref14, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, results, tables_commands, type;
      try {
        current = (await this._adapter.getSchemas());
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
        await Promise.all(add_columns_commands);
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
        await Promise.all(tables_commands);
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
        await Promise.all(indexes_commands);
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
            } else if (integrity.type === 'child_restrict') {
              type = 'restrict';
            } else if (integrity.type === 'child_delete') {
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
          results.push((await this._adapter.createForeignKey.apply(this._adapter, args)));
        }
        return results;
      } finally {
        if (options.verbose) {
          console.log('Applying schemas done');
        }
        this._applying_schemas = false;
        this._schema_changed = false;
      }
    });
    return this._promise_schema_applied;
  }

  //#
  // Drops all model tables
  // @promise
  async dropAllModels() {
    var i, len, model, ref;
    ref = this._getModelNamesByAssociationOrder();
    for (i = 0, len = ref.length; i < len; i++) {
      model = ref[i];
      await this.models[model].drop();
    }
  }

  //#
  // Logs
  // @param {String} model
  // @param {String} type
  // @param {Object} data
  log(model, type, data) { }

  _connectRedisCache() {
    var client, settings;
    if (this._redis_cache_client) {
      return this._redis_cache_client;
    } else if (!redis) {
      throw new Error('cache needs Redis');
    } else {
      settings = this._redis_cache_settings;
      this._redis_cache_client = client = settings.client || (redis.createClient(settings.port || 6379, settings.host || '127.0.0.1'));
      if (settings.database != null) {
        client.select(settings.database);
        client.once('connect', function() {
          client.send_anyways = true;
          client.select(settings.database);
          return client.send_anyways = false;
        });
      }
      return client;
    }
  }

  inspect(depth) {
    return inspect(this.models);
  }

  addAssociation() { }
  getInconsistencies() { }
  fetchAssociated() { }
  manipulate() { }
}

function applyMixins(derivedCtor: any, baseCtors: any[]) {
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

applyMixins(Connection, [ConnectionAssociation, ConnectionManipulate]);

Model._Connection = Connection;

export { Connection };
