let redis: any;

import { EventEmitter } from 'events';
import * as _ from 'lodash';
import { inspect } from 'util';

// tslint:disable-next-line:no-var-requires variable-name
const Toposort = require('toposort-class');

import { AdapterBase } from '../adapters/base';
import { IAdapterSettingsMongoDB } from '../adapters/mongodb';
import { IAdapterSettingsMySQL } from '../adapters/mysql';
import { IAdapterSettingsPostgreSQL } from '../adapters/postgresql';
import { IAdapterSettingsSQLite3 } from '../adapters/sqlite3';
import { ColorConsoleLogger, ConsoleLogger, EmptyLogger, ILogger } from '../logger';
import { BaseModel, IColumnProperty, IModelSchema, ModelColumnNamesWithId, ModelValueObject } from '../model';
import { IQueryArray, IQuerySingle } from '../query';
import { IsolationLevel, Transaction } from '../transaction';
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
  logger?: 'console' | 'color-console' | ILogger;
}

type AssociationIntegrityType = 'ignore' | 'nullify' | 'restrict' | 'delete';

export interface IAssociationHasManyOptions {
  connection?: Connection;
  type?: string;
  as?: string;
  foreign_key?: string;
  integrity?: AssociationIntegrityType;
}

export interface IAssociationHasOneOptions {
  connection?: Connection;
  type?: string;
  as?: string;
  foreign_key?: string;
  integrity?: AssociationIntegrityType;
}

export interface IAssociationBelongsToOptions {
  connection?: Connection;
  type?: string;
  as?: string;
  foreign_key?: string;
  required?: boolean;
}

interface IAssociation {
  type: 'hasMany' | 'hasOne' | 'belongsTo';
  this_model: typeof BaseModel;
  target_model_or_column: string | typeof BaseModel;
  options?: IAssociationHasManyOptions | IAssociationHasOneOptions | IAssociationBelongsToOptions;
}

interface ITxModelClass<M extends BaseModel> {
  new(data?: object): M;
  create(data?: ModelValueObject<M>): Promise<M>;
  createBulk(data?: Array<ModelValueObject<M>>): Promise<M[]>;
  count(condition?: object): Promise<number>;
  update(updates: any, condition?: object): Promise<number>;
  delete(condition?: object): Promise<number>;
  query(): IQueryArray<M>;
  find(id: types.RecordID): IQuerySingle<M>;
  find(id: types.RecordID[]): IQueryArray<M>;
  findPreserve(ids: types.RecordID[]): IQueryArray<M>;
  where(condition?: object): IQueryArray<M>;
  select<K extends ModelColumnNamesWithId<M>>(columns: K[]): IQueryArray<M, Pick<M, K>>;
  select<K extends ModelColumnNamesWithId<M>>(columns?: string): IQueryArray<M, Pick<M, K>>;
  order(orders: string): IQueryArray<M>;
  group<G extends ModelColumnNamesWithId<M>, F>(
    group_by: G | G[], fields?: F,
  ): IQueryArray<M, { [field in keyof F]: number } & Pick<M, G>>;
  group<F>(group_by: null, fields?: F): IQueryArray<M, { [field in keyof F]: number }>;
  group<U>(group_by: string | null, fields?: object): IQueryArray<M, U>;
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
  public models: { [name: string]: typeof BaseModel };

  /** @internal */
  public _logger!: ILogger;

  private _promise_schema_applied?: Promise<void>;

  private _pending_associations: IAssociation[];

  [name: string]: any;

  /**
   * Creates a connection
   * @see MySQLAdapter::connect
   * @see MongoDBAdapter::connect
   * @see PostgreSQLAdapter::connect
   * @see SQLite3Adapter::connect
   * @see RedisAdapter::connect
   */
  constructor(adapter: 'mongodb', settings: IConnectionSettings & IAdapterSettingsMongoDB);
  constructor(adapter: 'mysql', settings: IConnectionSettings & IAdapterSettingsMySQL);
  constructor(adapter: 'postgresql', settings: IConnectionSettings & IAdapterSettingsPostgreSQL);
  constructor(adapter: 'sqlite3', settings: IConnectionSettings & IAdapterSettingsSQLite3);
  constructor(adapter: 'sqlite3_memory' | ((connection: any) => AdapterBase), settings: IConnectionSettings);
  constructor(adapter: string | ((connection: any) => AdapterBase), settings: IConnectionSettings) {
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
    if (typeof adapter === 'string') {
      this._adapter = require(__dirname + '/../adapters/' + adapter).default(this);
    } else {
      this._adapter = adapter(this);
    }
    this._promise_connection = this._adapter.connect(settings).then(() => {
      this.connected = true;
    }).catch((error: Error) => {
      (this._adapter as any) = undefined;
      console.log('fail to connect', error);
    });
    Object.defineProperty(this, 'adapter', {
      get() { return this._adapter; },
    });
    this.setLogger(settings.logger);
  }

  /**
   * Set logger
   */
  public setLogger(logger?: 'console' | 'color-console' | ILogger) {
    if (logger) {
      if (logger === 'console') {
        this._logger = new ConsoleLogger();
      } else if (logger === 'color-console') {
        this._logger = new ColorConsoleLogger();
      } else {
        this._logger = logger;
      }
    } else {
      this._logger = new EmptyLogger();
    }
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
  public model(name: string, schema: IModelSchema) {
    return BaseModel.newModel(this, name, schema);
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

        // tslint:disable-next-line:forin
        for (const model in this.models) {
          const modelClass = this.models[model];
          const currentTable = current.tables && current.tables[modelClass.table_name];
          if (!currentTable || currentTable === 'NO SCHEMA') {
            continue;
          }
          // tslint:disable-next-line:forin
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

        // tslint:disable-next-line:forin
        for (const model in this.models) {
          const modelClass = this.models[model];
          if (!current.tables[modelClass.table_name]) {
            if (options.verbose) {
              console.log(`Creating table ${modelClass.table_name}`);
            }
            await this._adapter.createTable(model);
          }
        }

        // tslint:disable-next-line:forin
        for (const model in this.models) {
          const modelClass = this.models[model];
          for (const index of modelClass._indexes) {
            if (!(current.indexes && current.indexes[modelClass.table_name]
              && current.indexes[modelClass.table_name][index.options.name])) {
              if (options.verbose) {
                console.log(`Creating index on ${modelClass.table_name} ${Object.keys(index.columns)}`);
              }
              await this._adapter.createIndex(model, index);
            }
          }
        }

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

  public async isApplyingSchemasNecessary(): Promise<boolean> {
    this._initializeModels();
    if (!this._schema_changed) {
      return false;
    }
    this._applyAssociations();
    this._checkArchive();

    await this._promise_connection;

    const current = await this._adapter.getSchemas();

    // tslint:disable-next-line:forin
    for (const model in this.models) {
      const modelClass = this.models[model];
      const currentTable = current.tables && current.tables[modelClass.table_name];
      if (!currentTable || currentTable === 'NO SCHEMA') {
        continue;
      }
      // tslint:disable-next-line:forin
      for (const column in modelClass._schema) {
        const property = modelClass._schema[column];
        if (!currentTable[property._dbname_us]) {
          return true;
        }
      }
    }

    // tslint:disable-next-line:forin
    for (const model in this.models) {
      const modelClass = this.models[model];
      if (!current.tables[modelClass.table_name]) {
        return true;
      }
    }

    // tslint:disable-next-line:forin
    for (const model in this.models) {
      const modelClass = this.models[model];
      for (const index of modelClass._indexes) {
        if (!(current.indexes && current.indexes[modelClass.table_name]
          && current.indexes[modelClass.table_name][index.options.name])) {
          return true;
        }
      }
    }

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
          const current_foreign_key = current.foreign_keys && current.foreign_keys[modelClass.table_name]
            && current.foreign_keys[modelClass.table_name][integrity.column];
          if (!(current_foreign_key && current_foreign_key === integrity.parent.table_name)) {
            return true;
          }
        }
      }
    }

    return false;
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
  public async manipulate(commands: ManipulateCommand[]): Promise<{ [id: string]: any }> {
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
          key = undefined;
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
   * @see BaseModel.hasMany
   * @see BaseModel.belongsTo
   */
  public addAssociation(association: IAssociation) {
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
        let records = await modelClass.select('').exec();
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
            array.push(...records.map((record: any) => record.id));
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
  public async fetchAssociated(records: any, column: any, select?: any, options?: any) {
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

  public async getTransaction(options?: { isolation_level?: IsolationLevel }): Promise<Transaction> {
    const transaction = new Transaction(this);
    await transaction.setup(options && options.isolation_level);
    return transaction;
  }

  public async transaction<T, M1 extends BaseModel>(
    options: { isolation_level?: IsolationLevel, models: [ITxModelClass<M1>] },
    block: (m1: ITxModelClass<M1>, transaction: Transaction) => Promise<T>): Promise<T>;
  public async transaction<T>(
    options: { isolation_level?: IsolationLevel },
    block: (transaction: Transaction) => Promise<T>): Promise<T>;
  public async transaction<T>(block: (transaction: Transaction) => Promise<T>): Promise<T>;
  public async transaction<T>(
    options_or_block: { isolation_level?: IsolationLevel, models?: any[] } | ((...args: any[]) => Promise<T>),
    block?: (...args: any[]) => Promise<T>): Promise<T> {
    let options: { isolation_level?: IsolationLevel, models?: any[] };
    if (typeof options_or_block === 'function') {
      options = {};
      block = options_or_block;
    } else {
      options = options_or_block;
      block = block!;
    }
    const transaction = new Transaction(this);
    await transaction.setup(options && options.isolation_level);
    try {
      const args: any[] = (options.models || []).map((model) => {
        // tslint:disable-next-line:only-arrow-functions
        const txModel = function(data?: object) {
          const instance = new model(data);
          instance._transaction = transaction;
          return instance;
        };
        txModel.create = (data?: any) => {
          return model.create(data, { transaction });
        };
        txModel.createBulk = (data?: any[]) => {
          return model.createBulk(data, { transaction });
        };
        txModel.count = (condition?: object) => {
          return model.count(condition, { transaction });
        };
        txModel.update = (updates: any, condition?: object) => {
          return model.update(updates, condition, { transaction });
        };
        txModel.delete = (condition?: object) => {
          return model.delete(condition, { transaction });
        };
        txModel.query = () => {
          return model.query({ transaction });
        };
        txModel.find = (id: types.RecordID | types.RecordID[]) => {
          return model.find(id, { transaction });
        };
        txModel.findPreserve = (ids: types.RecordID[]) => {
          return model.findPreserve(ids, { transaction });
        };
        txModel.where = (condition?: object) => {
          return model.where(condition, { transaction });
        };
        txModel.select = (columns?: any) => {
          return model.select(columns, { transaction });
        };
        txModel.order = (orders: string) => {
          return model.order(orders, { transaction });
        };
        txModel.group = (group_by: string | null, fields?: object) => {
          return model.group(group_by, fields, { transaction });
        };
        return txModel;
      });
      args.push(transaction);
      const result = await block(...args);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
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
        const _Archive = class extends BaseModel { };
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
      let target_model: typeof BaseModel;
      if (typeof item.target_model_or_column === 'string') {
        let models;
        if (options && options.connection) {
          models = options.connection.models;
        } else {
          models = this.models;
        }
        let target_model_name: string;
        if (options && options.type) {
          target_model_name = options.type;
          options.as = item.target_model_or_column;
        } else if (item.type === 'belongsTo' || item.type === 'hasOne') {
          target_model_name = inflector.camelize(item.target_model_or_column);
        } else {
          target_model_name = inflector.classify(item.target_model_or_column);
        }
        if (!models[target_model_name]) {
          throw new Error(`model ${target_model_name} does not exist`);
        }
        target_model = models[target_model_name];
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
  private _hasMany(
    this_model: typeof BaseModel, target_model: typeof BaseModel,
    options?: IAssociationHasManyOptions,
  ) {
    let foreign_key: string;
    if (options && options.foreign_key) {
      foreign_key = options.foreign_key;
    } else if (options && options.as) {
      foreign_key = options.as + '_id';
    } else {
      foreign_key = inflector.foreign_key(this_model._name);
    }
    target_model.column(foreign_key, {
      connection: this_model._connection,
      type: types.RecordID,
    } as IColumnProperty);
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
          getter = async (reload?: boolean) => {
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
            const new_object: any = new target_model(data);
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
  private _hasOne(
    this_model: typeof BaseModel, target_model: typeof BaseModel,
    options?: IAssociationHasOneOptions,
  ) {
    let foreign_key: any;
    if (options && options.foreign_key) {
      foreign_key = options.foreign_key;
    } else if (options && options.as) {
      foreign_key = options.as + '_id';
    } else {
      foreign_key = inflector.foreign_key(this_model._name);
    }
    target_model.column(foreign_key, {
      connection: this_model._connection,
      type: types.RecordID,
    } as IColumnProperty);
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
  private _belongsTo(
    this_model: typeof BaseModel, target_model: typeof BaseModel,
    options?: IAssociationBelongsToOptions,
  ) {
    let foreign_key: any;
    if (options && options.foreign_key) {
      foreign_key = options.foreign_key;
    } else if (options && options.as) {
      foreign_key = options.as + '_id';
    } else {
      foreign_key = inflector.foreign_key(target_model._name);
    }
    this_model.column(foreign_key, {
      connection: target_model._connection,
      required: options && options.required,
      type: types.RecordID,
    } as IColumnProperty);
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
