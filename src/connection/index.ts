let redis: any;

import { EventEmitter } from 'events';
import * as _ from 'lodash';
import * as Toposort from 'toposort-class';
import { inspect } from 'util';

import { AdapterBase } from '../adapters/base';
import { IAdapterSettingsMongoDB } from '../adapters/mongodb';
import { IAdapterSettingsMySQL } from '../adapters/mysql';
import { IAdapterSettingsPostgreSQL } from '../adapters/postgresql';
import { IAdapterSettingsSQLite3 } from '../adapters/sqlite3';
import { Model } from '../model';
import * as types from '../types';
import * as inflector from '../util/inflector';

try {
  // tslint:disable-next-line:no-var-requires
  redis = require('redis');
} catch (error) {
  /**/
}

type ManipulateCommand = string | { [key: string]: any };

interface IConnectionSettings {
  is_default?: boolean;
  redis_cache?: {
    client?: object,
    host?: string,
    port?: number,
    database?: number,
  };
}

/**
 * Manages connection to a database
 */
class Connection extends EventEmitter {
  /**
   * Default connection
   * @see Connection::constructor
   */
  public static defaultConnection?: Connection;

  /**
   * Indicates the adapter associated to this connection
   * @private
   * @see Connection::constructor
   */
  public _adapter: AdapterBase;

  /**
   * Model lists using this connection.
   * Maps from model name to model class
   * @see Connection::constructor
   */
  public models: { [name: string]: typeof Model };

  [name: string]: any;

  /**
   * Creates a connection
   * @see MySQLAdapter::connect
   * @see MongoDBAdapter::connect
   * @see PostgreSQLAdapter::connect
   * @see SQLite3Adapter::connect
   * @see RedisAdapter::connect
   */
  constructor(adapter_name: 'mongodb', settings: IConnectionSettings & IAdapterSettingsMongoDB);
  constructor(adapter_name: 'mysql', settings: IConnectionSettings & IAdapterSettingsMySQL);
  constructor(adapter_name: 'postgresql', settings: IConnectionSettings & IAdapterSettingsPostgreSQL);
  constructor(adapter_name: 'sqlite3', settings: IConnectionSettings & IAdapterSettingsSQLite3);
  constructor(adapter_name: 'sqlite3_memory', settings: IConnectionSettings);
  constructor(adapter_name: string, settings: IConnectionSettings) {
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
    }).catch((error: Error) => {
      (this._adapter as any) = undefined;
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
  public close() {
    if (Connection.defaultConnection === this) {
      Connection.defaultConnection = undefined;
    }
    this._adapter.close();
    (this._adapter as any) = undefined;
  }

  /**
   * Creates a model class
   */
  public model(name: string, schema: any) {
    return Model.newModel(this, name, schema);
  }

  /**
   * Applies schemas
   * @see AdapterBase::applySchema
   */
  public async applySchemas(options: { verbose?: boolean } = {}) {
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
      try {
        const current = await this._adapter.getSchemas();
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
        await Promise.all(add_columns_commands);

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
        await Promise.all(tables_commands);

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
        await Promise.all(indexes_commands);

        const foreign_keys_commands = [];
        // tslint:disable-next-line:forin
        for (const model in this.models) {
          const modelClass = this.models[model];
          for (const integrity of modelClass._integrities) {
            let type = '';
            if (integrity.type === 'child_nullify') {
              type = 'nullify';
            } else if (integrity.type === 'child_restrict') {
              type = 'restrict';
            } else if (integrity.type === 'child_delete') {
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
          await this._adapter.createForeignKey.apply(this._adapter, args);
        }
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

  /**
   * Drops all model tables
   */
  public async dropAllModels() {
    for (const model of this._getModelNamesByAssociationOrder()) {
      await this.models[model].drop();
    }
  }

  /**
   * Logs
   */
  public log(model: string, type: string, data: object) { /**/ }

  public inspect() {
    return inspect(this.models);
  }

  /**
   * Manipulate data
   */
  public async manipulate(commands: ManipulateCommand[]): Promise<any> {
    this.log('<conn>', 'manipulate', commands);
    await this._checkSchemaApplied();
    const id_to_record_map: { [id: string]: any } = {};
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
        } else {
          key = void 0;
        }
      } else if (typeof command === 'string') {
        key = command;
      }
      if (!key) {
        throw new Error('invalid command: ' + JSON.stringify(command));
      } else if (key.substr(0, 7) === 'create_') {
        const model = key.substr(7);
        const id = data.id;
        delete data.id;
        this._manipulateConvertIds(id_to_record_map, model, data);
        const record = await this._manipulateCreate(model, data);
        if (id) {
          id_to_record_map[id] = record;
        }
      } else if (key.substr(0, 7) === 'delete_') {
        const model = key.substr(7);
        await this._manipulateDelete(model, data);
      } else if (key === 'deleteAll') {
        await this._manipulateDeleteAllModels();
      } else if (key.substr(0, 5) === 'drop_') {
        const model = key.substr(5);
        await this._manipulateDropModel(model);
      } else if (key === 'dropAll') {
        await this._manipulateDropAllModels();
      } else if (key.substr(0, 5) === 'find_') {
        const model = key.substr(5);
        const id = data.id;
        delete data.id;
        if (!id) {
          continue;
        }
        const records = await this._manipulateFind(model, data);
        id_to_record_map[id] = records;
      } else {
        throw new Error('unknown command: ' + key);
      }
    }
    return id_to_record_map;
  }

  /**
   * Adds an association
   * @see Model.hasMany
   * @see Model.belongsTo
   */
  public addAssociation(association: any) {
    this._pending_associations.push(association);
    this._schema_changed = true;
  }

  /**
   * Returns inconsistent records against associations
   */
  public async getInconsistencies() {
    await this._checkSchemaApplied();
    const result: any = {};
    const promises = Object.keys(this.models).map(async (model) => {
      const modelClass = this.models[model];
      const integrities = modelClass._integrities.filter((integrity) => integrity.type.substr(0, 7) === 'parent_');
      if (integrities.length > 0) {
        let records = await modelClass.select('');
        const ids = records.map((record: any) => record.id);
        const sub_promises = integrities.map(async (integrity) => {
          const query = integrity.child.select('');
          query.where(_.zipObject([integrity.column], [{ $not: { $in: ids } }]));
          const property = integrity.child._schema[integrity.column];
          if (!property.required) {
            query.where(_.zipObject([integrity.column], [{ $not: null }]));
          }
          records = await query.exec();
          if (records.length > 0) {
            const array = result[integrity.child._name] || (result[integrity.child._name] = []);
            [].push.apply(array, records.map((record: any) => record.id));
            _.uniq(array);
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
  public async fetchAssociated(records: any, column: any, select: any, options: any) {
    if ((select != null) && typeof select === 'object') {
      options = select;
      select = null;
    } else if (options == null) {
      options = {};
    }
    await this._checkSchemaApplied();
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
    } else if (options.model) {
      association = options.model._associations && options.model._associations[column];
    } else {
      association = record.constructor._associations && record.constructor._associations[column];
    }
    if (!association) {
      throw new Error(`unknown column '${column}'`);
    }
    if (association.type === 'belongsTo') {
      return await this._fetchAssociatedBelongsTo(records, association.target_model, column, select, options);
    } else if (association.type === 'hasMany') {
      return await this._fetchAssociatedHasMany(records, association.target_model, association.foreign_key,
        column, select, options);
    } else {
      throw new Error(`unknown column '${column}'`);
    }
  }

  public async _checkSchemaApplied() {
    this._initializeModels();
    if (!this._applying_schemas && !this._schema_changed) {
      return;
    }
    return await this.applySchemas();
  }

  public _connectRedisCache() {
    if (this._redis_cache_client) {
      return this._redis_cache_client;
    } else if (!redis) {
      throw new Error('cache needs Redis');
    } else {
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

  private _initializeModels() {
    // tslint:disable-next-line:forin
    for (const model in this.models) {
      const modelClass = this.models[model];
      if (modelClass.initialize && !modelClass._initialize_called) {
        modelClass.initialize();
        modelClass._initialize_called = true;
      }
    }
  }

  private _checkArchive() {
    // tslint:disable-next-line:forin
    for (const model in this.models) {
      const modelClass = this.models[model];
      if (modelClass.archive && !modelClass._connection.models.hasOwnProperty('_Archive')) {
        // tslint:disable-next-line:max-classes-per-file
        const _Archive = class extends Model { };
        _Archive.connection(modelClass._connection);
        _Archive.archive = false;
        _Archive.column('model', String);
        _Archive.column('data', Object);
      }
    }
  }

  private _getModelNamesByAssociationOrder(): string[] {
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
        } else if (type === 'belongsTo') {
          t.add(model, association.target_model._name);
        }
      }
    }
    return t.sort();
  }

  private async _manipulateCreate(model: string, data: any) {
    model = inflector.camelize(model);
    if (!this.models[model]) {
      throw new Error(`model ${model} does not exist`);
    }
    return await this.models[model].create(data, { skip_log: true });
  }

  private async _manipulateDelete(model: string, data: any) {
    model = inflector.camelize(model);
    if (!this.models[model]) {
      throw new Error(`model ${model} does not exist`);
    }
    await this.models[model].where(data).delete({ skip_log: true });
  }

  private async _manipulateDeleteAllModels() {
    for (const model of Object.keys(this.models)) {
      if (model === '_Archive') {
        return;
      }
      await this.models[model].where().delete({ skip_log: true });
    }
  }

  private async _manipulateDropModel(model: string) {
    model = inflector.camelize(model);
    if (!this.models[model]) {
      throw new Error(`model ${model} does not exist`);
    }
    await this.models[model].drop();
  }

  private async _manipulateDropAllModels() {
    await this.dropAllModels();
  }

  private async _manipulateFind(model: string, data: any) {
    model = inflector.camelize(inflector.singularize(model));
    if (!this.models[model]) {
      throw new Error(`model ${model} does not exist`);
    }
    return await this.models[model].where(data).exec({ skip_log: true });
  }

  private _manipulateConvertIds(id_to_record_map: { [id: string]: any; }, model: string, data: any) {
    model = inflector.camelize(model);
    if (!this.models[model]) {
      return;
    }
    // tslint:disable-next-line:forin
    for (const column in this.models[model]._schema) {
      const property = this.models[model]._schema[column];
      if (property.record_id && data.hasOwnProperty(column)) {
        if (property.array && Array.isArray(data[column])) {
          data[column] = data[column].map((value: any) => {
            const record = id_to_record_map[value];
            if (record) {
              return record.id;
            } else {
              return value;
            }
          });
        } else {
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
  private _applyAssociations() {
    for (const item of this._pending_associations) {
      const this_model = item.this_model;
      const options = item.options;
      let target_model;
      if (typeof item.target_model_or_column === 'string') {
        let models;
        if (item.options && item.options.connection) {
          models = item.options.connection.models;
        } else {
          models = this.models;
        }
        if (item.options && item.options.type) {
          target_model = item.options.type;
          options.as = item.target_model_or_column;
        } else if (item.type === 'belongsTo' || item.type === 'hasOne') {
          target_model = inflector.camelize(item.target_model_or_column);
        } else {
          target_model = inflector.classify(item.target_model_or_column);
        }
        if (!models[target_model]) {
          throw new Error(`model ${target_model} does not exist`);
        }
        target_model = models[target_model];
      } else {
        target_model = item.target_model_or_column;
      }
      this['_' + item.type](this_model, target_model, options);
    }
    this._pending_associations = [];
  }

  /**
   * Adds a has-many association
   */
  private _hasMany(this_model: any, target_model: any, options: any) {
    let foreign_key: any;
    if (options != null ? options.foreign_key : void 0) {
      foreign_key = options.foreign_key;
    } else if (options != null ? options.as : void 0) {
      foreign_key = options.as + '_id';
    } else {
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
        let getter: any;
        // getter must be created per instance due to __scope
        if (!this.hasOwnProperty(columnGetter)) {
          getter = async (reload: any) => {
            // this is getter.__scope in normal case (this_model_instance.target_model_name()),
            // but use getter.__scope for safety
            const self = getter.__scope;
            if ((!self[columnCache] || reload) && self.id) {
              const records = await target_model.where(_.zipObject([foreign_key], [self.id]));
              self[columnCache] = records;
              return records;
            } else {
              return self[columnCache] || [];
            }
          };
          getter.build = (data: any) => {
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
  private _hasOne(this_model: any, target_model: any, options: any) {
    let foreign_key: any;
    if (options != null ? options.foreign_key : void 0) {
      foreign_key = options.foreign_key;
    } else if (options != null ? options.as : void 0) {
      foreign_key = options.as + '_id';
    } else {
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
        let getter: any;
        // getter must be created per instance due to __scope
        if (!this.hasOwnProperty(columnGetter)) {
          getter = async (reload: any) => {
            // this is getter.__scope in normal case (this_model_instance.target_model_name()),
            // but use getter.__scope for safety
            const self = getter.__scope;
            if ((!self[columnCache] || reload) && self.id) {
              const records = await target_model.where(_.zipObject([foreign_key], [self.id]));
              if (records.length > 1) {
                throw new Error('integrity error');
              }
              const record = records.length === 0 ? null : records[0];
              self[columnCache] = record;
              return record;
            } else {
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
  private _belongsTo(this_model: any, target_model: any, options: any) {
    let foreign_key: any;
    if (options != null ? options.foreign_key : void 0) {
      foreign_key = options.foreign_key;
    } else if (options != null ? options.as : void 0) {
      foreign_key = options.as + '_id';
    } else {
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
        let getter: any;
        // getter must be created per instance due to __scope
        if (!this.hasOwnProperty(columnGetter)) {
          getter = async (reload: any) => {
            // this is getter.__scope in normal case (this_model_instance.target_model_name()),
            // but use getter.__scope for safety
            const self = getter.__scope;
            if ((!self[columnCache] || reload) && self[foreign_key]) {
              const record = await target_model.find(self[foreign_key]);
              self[columnCache] = record;
              return record;
            } else {
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

  private async _fetchAssociatedBelongsTo(records: any, target_model: any, column: any, select: any, options: any) {
    const id_column = column + '_id';
    if (Array.isArray(records)) {
      const id_to_record_map: any = {};
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
        const sub_records: any[] = await query.exec();
        sub_records.forEach((sub_record) => {
          id_to_record_map[sub_record.id].forEach((record: any) => {
            if (options.lean) {
              record[column] = sub_record;
            } else {
              Object.defineProperty(record, column, { enumerable: true, value: sub_record });
            }
          });
        });
        records.forEach((record) => {
          if (!record.hasOwnProperty(column)) {
            if (options.lean) {
              record[column] = null;
            } else {
              Object.defineProperty(record, column, { enumerable: true, value: null });
            }
          }
        });
      } catch (error) {
        //
      }
    } else {
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
          const sub_record = await query.exec();
          if (options.lean) {
            records[column] = sub_record;
          } else {
            Object.defineProperty(records, column, { enumerable: true, value: sub_record });
          }
        } catch (error) {
          if (error && error.message !== 'not found') {
            throw error;
          }
          if (!records.hasOwnProperty(column)) {
            if (options.lean) {
              records[column] = null;
            } else {
              Object.defineProperty(records, column, { enumerable: true, value: null });
            }
          }
        }
      } else if (!records.hasOwnProperty(column)) {
        if (options.lean) {
          records[column] = null;
        } else {
          Object.defineProperty(records, column, { enumerable: true, value: null });
        }
      }
    }
  }

  private async _fetchAssociatedHasMany(records: any, target_model: any, foreign_key: any,
    column: any, select: any, options: any) {
    if (Array.isArray(records)) {
      const ids = records.map((record) => {
        if (options.lean) {
          record[column] = [];
        } else {
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
        const sub_records = await query.exec();
        sub_records.forEach((sub_record: any) => {
          records.forEach((record) => {
            if (record.id === sub_record[foreign_key]) {
              record[column].push(sub_record);
            }
          });
        });
      } catch (error) {
        //
      }
    } else {
      if (options.lean) {
        records[column] = [];
      } else {
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
        const sub_records = await query.exec();
        sub_records.forEach((sub_record: any) => {
          return records[column].push(sub_record);
        });
      } catch (error) {
        //
      }
    }
  }
}

export { Connection };
