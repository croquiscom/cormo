import { EventEmitter } from 'events';
import { inspect } from 'util';
import _ from 'lodash';
import { AdapterBase } from '../adapters/base.js';
import { createAdapter as createMongoDBAdapter, AdapterSettingsMongoDB, MongoDBAdapter } from '../adapters/mongodb.js';
import { createAdapter as createMySQLAdapter, AdapterSettingsMySQL, MySQLAdapter } from '../adapters/mysql.js';
import {
  createAdapter as createPostgreSQLAdapter,
  AdapterSettingsPostgreSQL,
  PostgreSQLAdapter,
} from '../adapters/postgresql.js';
import { createAdapter as createRedisAdapter } from '../adapters/redis.js';
import { createAdapter as createSQLite3Adapter, AdapterSettingsSQLite3, SQLite3Adapter } from '../adapters/sqlite3.js';
import { createAdapter as createSQLite3MemoryAdapter } from '../adapters/sqlite3_memory.js';
import { ColorConsoleLogger, ConsoleLogger, EmptyLogger, Logger } from '../logger/index.js';
import { BaseModel, ColumnProperty, ModelSchema, ModelColumnNamesWithId, ModelValueObject } from '../model/index.js';
import { QueryArray, QuerySingle } from '../query.js';
import { IsolationLevel, Transaction } from '../transaction.js';
import * as types from '../types.js';
import * as inflector from '../util/inflector.js';

const adapter_creaters: Record<string, (connection: Connection) => AdapterBase> = {
  mongodb: createMongoDBAdapter,
  mysql: createMySQLAdapter,
  postgresql: createPostgreSQLAdapter,
  redis: createRedisAdapter,
  sqlite3: createSQLite3Adapter,
  sqlite3_memory: createSQLite3MemoryAdapter,
};

let Toposort: any;
// @ts-expect-error no type definitions
import('toposort-class').then((m) => {
  Toposort = m.default;
});

let redis: any;
try {
  import('ioredis').then((m) => {
    redis = m.default;
  });
} catch {
  /**/
}

type ManipulateCommand = string | { [key: string]: any };

interface RedisCacheSettings {
  client?: object;
  host?: string;
  port?: number;
  database?: number;
}

interface ConnectionSettings {
  is_default?: boolean;
  redis_cache?: RedisCacheSettings;
  implicit_apply_schemas?: boolean;
  logger?: 'console' | 'color-console' | 'empty' | Logger;
  connection_retry_count?: number;
}

export interface MongoDBConnectionSettings extends ConnectionSettings, AdapterSettingsMongoDB {}

export interface MySQLConnectionSettings extends ConnectionSettings, AdapterSettingsMySQL {}

export interface PostgreSQLConnectionSettings extends ConnectionSettings, AdapterSettingsPostgreSQL {}

export interface SQLite3ConnectionSettings extends ConnectionSettings, AdapterSettingsSQLite3 {}

type AssociationIntegrityType = 'ignore' | 'nullify' | 'restrict' | 'delete';

export interface AssociationHasManyOptions {
  connection?: Connection;
  type?: string;
  as?: string;
  foreign_key?: string;
  integrity?: AssociationIntegrityType;
}

export interface AssociationHasOneOptions {
  connection?: Connection;
  type?: string;
  as?: string;
  foreign_key?: string;
  integrity?: AssociationIntegrityType;
}

export interface AssociationBelongsToOptions {
  connection?: Connection;
  type?: string;
  as?: string;
  foreign_key?: string;
  required?: boolean;
}

export interface SchemaChange {
  message: string;
  is_query?: boolean;
  ignorable?: boolean; // ignored change while applying schema
}

interface Association {
  type: 'hasMany' | 'hasOne' | 'belongsTo';
  this_model: typeof BaseModel;
  target_model_or_column: string | typeof BaseModel;
  options?: AssociationHasManyOptions | AssociationHasOneOptions | AssociationBelongsToOptions;
}

interface TxModelClass<M extends BaseModel> {
  new (data?: object): M;
  create(data?: ModelValueObject<M>): Promise<M>;
  createBulk(data?: Array<ModelValueObject<M>>): Promise<M[]>;
  count(condition?: object): Promise<number>;
  update(updates: any, condition?: object): Promise<number>;
  delete(condition?: object): Promise<number>;
  query(): QueryArray<M>;
  find(id: types.RecordID): QuerySingle<M>;
  find(id: types.RecordID[]): QueryArray<M>;
  findPreserve(ids: types.RecordID[]): QueryArray<M>;
  where(condition?: object): QueryArray<M>;
  select<K extends ModelColumnNamesWithId<M>>(columns: K[]): QueryArray<M, Pick<M, K>>;
  select<K extends ModelColumnNamesWithId<M>>(columns?: string): QueryArray<M, Pick<M, K>>;
  order(orders: string): QueryArray<M>;
  group<G extends ModelColumnNamesWithId<M>, F>(
    group_by: G | G[],
    fields?: F,
  ): QueryArray<M, { [field in keyof F]: number } & Pick<M, G>>;
  group<F>(group_by: null, fields?: F): QueryArray<M, { [field in keyof F]: number }>;
  group<U>(group_by: string | null, fields?: object): QueryArray<M, U>;
}

/**
 * Manages connection to a database
 */
class Connection<AdapterType extends AdapterBase = AdapterBase> extends EventEmitter {
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
  public _adapter: AdapterType;

  public get adapter(): AdapterType {
    return this._adapter;
  }

  /**
   * Model lists using this connection.
   * Maps from model name to model class
   * @see Connection::constructor
   */
  public models: Partial<{ [name: string]: typeof BaseModel }>;

  /** @internal */
  public _logger!: Logger;

  /** @internal */
  public _schema_changed: boolean = false;

  /** @internal */
  public _promise_connection: Promise<void>;

  /** @internal */
  private _promise_schema_applied?: Promise<void>;

  /** @internal */
  private _pending_associations: Association[];

  /** @internal */
  private _redis_cache_settings: RedisCacheSettings;

  /** @internal */
  private _redis_cache_client: any;

  /** @internal */
  private _connected: boolean = false;

  /** @internal */
  private _applying_schemas: boolean = false;

  /** @internal */
  private _implicit_apply_schemas: boolean = false;

  /** @internal */
  private _connection_retry_count: number = 99999;

  [name: string]: any;

  /**
   * Creates a connection
   * @see MySQLAdapter::connect
   * @see MongoDBAdapter::connect
   * @see PostgreSQLAdapter::connect
   * @see SQLite3Adapter::connect
   * @see RedisAdapter::connect
   */
  constructor(adapter: 'mongodb' | typeof createMongoDBAdapter, settings: MongoDBConnectionSettings);
  constructor(adapter: 'mysql' | typeof createMySQLAdapter, settings: MySQLConnectionSettings);
  constructor(adapter: 'postgresql' | typeof createPostgreSQLAdapter, settings: PostgreSQLConnectionSettings);
  constructor(adapter: 'sqlite3' | typeof createSQLite3Adapter, settings: SQLite3ConnectionSettings);
  constructor(adapter: 'sqlite3_memory' | typeof createSQLite3Adapter, settings: ConnectionSettings);
  constructor(adapter: string | ((connection: Connection) => AdapterType), settings: ConnectionSettings) {
    super();
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
      this._adapter = adapter_creaters[adapter](this) as AdapterType;
    } else {
      this._adapter = adapter(this);
    }
    this._promise_connection = this._connect(settings);
    this.setLogger(settings.logger);
  }

  /**
   * Set logger
   */
  public setLogger(logger?: 'console' | 'color-console' | 'empty' | Logger) {
    if (logger) {
      if (logger === 'console') {
        this._logger = new ConsoleLogger();
      } else if (logger === 'color-console') {
        this._logger = new ColorConsoleLogger();
      } else if (logger === 'empty') {
        this._logger = new EmptyLogger();
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
  public model(name: string, schema: ModelSchema): typeof BaseModel {
    return BaseModel.newModel(this, name, schema);
  }

  /**
   * Applies schemas
   * @see AdapterBase::applySchema
   */
  public async applySchemas(options: { verbose?: boolean; apply_description_change?: boolean } = {}) {
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
              } else if (!property.required && current_column.required) {
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
                    console.log(
                      `Changing ${model_class.table_name}.${column}'s description to '${property.description}'`,
                    );
                  }
                  await this._adapter.updateColumnDescription(model, property, options.verbose);
                }
              } else {
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
          } else if (
            current_table !== 'NO SCHEMA' &&
            (current_table.description ?? '') !== (model_class.description ?? '')
          ) {
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
            } else if (integrity.type === 'child_restrict') {
              type = 'restrict';
            } else if (integrity.type === 'child_delete') {
              type = 'delete';
            }
            if (type) {
              const current_foreign_key =
                current.foreign_keys &&
                current.foreign_keys[model_class.table_name] &&
                current.foreign_keys[model_class.table_name][integrity.column];
              if (!(current_foreign_key && current_foreign_key === integrity.parent!.table_name)) {
                if (options.verbose) {
                  const table_name = model_class.table_name;
                  const parent_table_name = integrity.parent!.table_name;
                  console.log(`Adding foreign key ${table_name}.${integrity.column} to ${parent_table_name}`);
                }
                await this._adapter.createForeignKey(model, integrity.column, type, integrity.parent!, options.verbose);
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
    const changes = await this.getSchemaChanges();
    return _.some(changes, (change) => change.ignorable !== true);
  }

  /**
   * Returns changes of schama
   * @see AdapterBase::applySchema
   */
  public async getSchemaChanges(): Promise<SchemaChange[]> {
    this._initializeModels();
    this.applyAssociations();
    this._checkArchive();
    await this._promise_connection;

    const changes: SchemaChange[] = [];

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
          } else if (!property.required && current_column.required) {
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
          } else {
            changes.push({
              message: `(Skip) Change ${model_class.table_name}.${column}'s description to '${property.description}'`,
              ignorable: true,
            });
          }
        }
      }
      for (const column in current_table.columns) {
        if (!_.find(model_class._schema, { _dbname_us: column })) {
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
      } else if (
        current_table !== 'NO SCHEMA' &&
        (current_table.description ?? '') !== (model_class.description ?? '')
      ) {
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
      if (!_.find(this.models, { table_name })) {
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
        if (
          !_.find(model_class._indexes, (item) => item.options.name === index) &&
          !_.find(model_class._integrities, (item) => item.column === index)
        ) {
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
        } else if (integrity.type === 'child_restrict') {
          type = 'restrict';
        } else if (integrity.type === 'child_delete') {
          type = 'delete';
        }
        if (type) {
          const current_foreign_key =
            current.foreign_keys &&
            current.foreign_keys[model_class.table_name] &&
            current.foreign_keys[model_class.table_name][integrity.column];
          if (
            !(current_foreign_key && current_foreign_key === integrity.parent!.table_name) &&
            this._adapter.native_integrity
          ) {
            const table_name = model_class.table_name;
            const parent_table_name = integrity.parent!.table_name;
            changes.push({ message: `Add foreign key ${table_name}.${integrity.column} to ${parent_table_name}` });
            const query = this._adapter.getCreateForeignKeyQuery(model, integrity.column, type, integrity.parent!);
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
  public async dropAllModels() {
    for (const model_name of this._getModelNamesByAssociationOrder()) {
      await this.models[model_name]?.drop();
    }
  }

  /**
   * Logs
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public log(model_name: string, type: string, data: object) {
    /**/
  }

  public [inspect.custom]() {
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
        const model_name = key.substr(7);
        const id = data.id;
        delete data.id;
        this._manipulateConvertIds(id_to_record_map, model_name, data);
        const record = await this._manipulateCreate(model_name, data);
        if (id) {
          id_to_record_map[id] = record;
        }
      } else if (key.substr(0, 7) === 'delete_') {
        const model_name = key.substr(7);
        await this._manipulateDelete(model_name, data);
      } else if (key === 'deleteAll') {
        await this._manipulateDeleteAllModels();
      } else if (key.substr(0, 5) === 'drop_') {
        const model_name = key.substr(5);
        await this._manipulateDropModel(model_name);
      } else if (key === 'dropAll') {
        await this._manipulateDropAllModels();
      } else if (key.substr(0, 5) === 'find_') {
        const model_name = key.substr(5);
        const id = data.id;
        delete data.id;
        if (!id) {
          continue;
        }
        const records = await this._manipulateFind(model_name, data);
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
  public addAssociation(association: Association) {
    this._pending_associations.push(association);
    this._schema_changed = true;
  }

  /**
   * Returns inconsistent records against associations
   */
  public async getInconsistencies() {
    await this._checkSchemaApplied();
    const result: any = {};
    const promises = Object.keys(this.models).map(async (model_name) => {
      const model_class = this.models[model_name];
      if (!model_class) {
        return;
      }
      const integrities = model_class._integrities.filter((integrity) => integrity.type.substr(0, 7) === 'parent_');
      if (integrities.length > 0) {
        let records = await model_class.select('').exec();
        const ids = records.map((record: any) => record.id);
        const sub_promises = integrities.map(async (integrity) => {
          const query = integrity.child!.select('');
          query.where(_.zipObject([integrity.column], [{ $not: { $in: ids } }]));
          const property = integrity.child!._schema[integrity.column];
          if (!property?.required) {
            query.where(_.zipObject([integrity.column], [{ $not: null }]));
          }
          records = await query.exec();
          if (records.length > 0) {
            const array = result[integrity.child!._name] || (result[integrity.child!._name] = []);
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
  public async fetchAssociated(
    records: any,
    column: string,
    select?: string,
    options?: { lean?: boolean; model?: typeof BaseModel; transaction?: Transaction },
  ) {
    if (select != null && typeof select === 'object') {
      options = select;
      select = undefined;
    } else if (options == null) {
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
    } else {
      association = record.constructor._associations && record.constructor._associations[column];
    }
    if (!association) {
      throw new Error(`unknown column '${column}'`);
    }
    if (association.type === 'belongsTo') {
      return await this._fetchAssociatedBelongsTo(records, association.target_model, column, select, options);
    } else if (association.type === 'hasMany') {
      return await this._fetchAssociatedHasMany(
        records,
        association.target_model,
        association.foreign_key,
        column,
        select,
        options,
      );
    } else {
      throw new Error(`unknown column '${column}'`);
    }
  }

  /**
   * Applies pending associations
   */
  public applyAssociations() {
    this._initializeModels();
    for (const item of this._pending_associations) {
      const this_model = item.this_model;
      const options = item.options;
      let target_model: typeof BaseModel;
      if (typeof item.target_model_or_column === 'string') {
        let models: Partial<{ [name: string]: typeof BaseModel }>;
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
        const model = models[target_model_name];
        if (!model) {
          throw new Error(`model ${target_model_name} does not exist`);
        }
        target_model = model;
      } else {
        target_model = item.target_model_or_column;
      }
      this['_' + item.type](this_model, target_model, options);
    }
    this._pending_associations = [];
  }

  public async getTransaction(options?: { isolation_level?: IsolationLevel }): Promise<Transaction> {
    await this._promise_connection;
    const transaction = new Transaction(this);
    await transaction.setup(options && options.isolation_level);
    return transaction;
  }

  public async transaction<T, M1 extends BaseModel>(
    options: { isolation_level?: IsolationLevel; models: [TxModelClass<M1>] },
    block: (m1: TxModelClass<M1>, transaction: Transaction) => Promise<T>,
  ): Promise<T>;
  public async transaction<T, M1 extends BaseModel, M2 extends BaseModel>(
    options: { isolation_level?: IsolationLevel; models: [TxModelClass<M1>, TxModelClass<M2>] },
    block: (m1: TxModelClass<M1>, m2: TxModelClass<M2>, transaction: Transaction) => Promise<T>,
  ): Promise<T>;
  public async transaction<T, M1 extends BaseModel, M2 extends BaseModel, M3 extends BaseModel>(
    options: { isolation_level?: IsolationLevel; models: [TxModelClass<M1>, TxModelClass<M2>, TxModelClass<M3>] },
    block: (m1: TxModelClass<M1>, m2: TxModelClass<M2>, m3: TxModelClass<M3>, transaction: Transaction) => Promise<T>,
  ): Promise<T>;
  public async transaction<T, M1 extends BaseModel, M2 extends BaseModel, M3 extends BaseModel, M4 extends BaseModel>(
    options: {
      isolation_level?: IsolationLevel;
      models: [TxModelClass<M1>, TxModelClass<M2>, TxModelClass<M3>, TxModelClass<M4>];
    },
    block: (
      m1: TxModelClass<M1>,
      m2: TxModelClass<M2>,
      m3: TxModelClass<M3>,
      m4: TxModelClass<M4>,
      transaction: Transaction,
    ) => Promise<T>,
  ): Promise<T>;
  public async transaction<
    T,
    M1 extends BaseModel,
    M2 extends BaseModel,
    M3 extends BaseModel,
    M4 extends BaseModel,
    M5 extends BaseModel,
  >(
    options: {
      isolation_level?: IsolationLevel;
      models: [TxModelClass<M1>, TxModelClass<M2>, TxModelClass<M3>, TxModelClass<M4>, TxModelClass<M4>];
    },
    block: (
      m1: TxModelClass<M1>,
      m2: TxModelClass<M2>,
      m3: TxModelClass<M3>,
      m4: TxModelClass<M4>,
      m5: TxModelClass<M5>,
      transaction: Transaction,
    ) => Promise<T>,
  ): Promise<T>;
  public async transaction<T>(
    options: { isolation_level?: IsolationLevel },
    block: (transaction: Transaction) => Promise<T>,
  ): Promise<T>;
  public async transaction<T>(block: (transaction: Transaction) => Promise<T>): Promise<T>;
  public async transaction<T>(
    options_or_block: { isolation_level?: IsolationLevel; models?: any[] } | ((...args: any[]) => Promise<T>),
    block?: (...args: any[]) => Promise<T>,
  ): Promise<T> {
    let options: { isolation_level?: IsolationLevel; models?: any[] };
    if (typeof options_or_block === 'function') {
      options = {};
      block = options_or_block;
    } else {
      options = options_or_block;
    }
    const transaction = new Transaction(this);
    await transaction.setup(options.isolation_level);
    try {
      const args: any[] = (options.models || []).map((model) => {
        const txModel = function (data?: object) {
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
      const result = await block!(...args);
      await transaction.commit();
      return result;
    } catch (error: any) {
      await transaction.rollback();
      throw error;
    }
  }

  public async _checkSchemaApplied() {
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

  public _connectRedisCache() {
    if (this._redis_cache_client) {
      return this._redis_cache_client;
    } else if (!redis) {
      throw new Error('cache needs Redis');
    } else {
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

  private async _connect(settings: ConnectionSettings, count = 0) {
    try {
      await this._adapter.connect(settings);
      this._connected = true;
    } catch (error: any) {
      if (this._connection_retry_count && this._connection_retry_count <= count) {
        throw new Error('failed to connect');
      }
      // try again with delay
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 5000 * (count + 1));
      });
      console.log('try again to connect', error.cause ? error.cause.toString() : error.toString());
      await this._connect(settings, count + 1);
    }
  }

  private _initializeModels() {
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

  private _checkArchive() {
    for (const model_name in this.models) {
      const model_class = this.models[model_name];
      if (!model_class) {
        continue;
      }
      if (model_class.archive && !Object.prototype.hasOwnProperty.call(model_class._connection.models, '_Archive')) {
        const _Archive = class extends BaseModel {};
        _Archive.connection(model_class._connection);
        _Archive.archive = false;
        _Archive.column('model', String);
        _Archive.column('data', Object);
      }
    }
  }

  private _getModelNamesByAssociationOrder(): string[] {
    const t = new Toposort();
    for (const model_name in this.models) {
      const model_class = this.models[model_name];
      if (!model_class) {
        continue;
      }
      t.add(model_name, []);
      for (const name in model_class._associations) {
        const association: any = model_class._associations[name];
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
        } else if (type === 'belongsTo') {
          t.add(model_name, association.target_model._name);
        }
      }
    }
    return t.sort();
  }

  private async _manipulateCreate(model_name: string, data: any) {
    model_name = inflector.camelize(model_name);
    const model_class = this.models[model_name];
    if (!model_class) {
      throw new Error(`model ${model_name} does not exist`);
    }
    return await model_class.create(data, { skip_log: true });
  }

  private async _manipulateDelete(model_name: string, data: any) {
    model_name = inflector.camelize(model_name);
    const model_class = this.models[model_name];
    if (!model_class) {
      throw new Error(`model ${model_name} does not exist`);
    }
    await model_class.where(data).delete({ skip_log: true });
  }

  private async _manipulateDeleteAllModels() {
    const model_list = Object.keys(this.models).filter((key) => key !== '_Archive');
    try {
      await this.adapter.deleteAllIgnoringConstraint(model_list);
    } catch (error: any) {
      if (error.message === 'not implemented') {
        await Promise.all(model_list.map((model_name) => this.models[model_name]?.where().delete({ skip_log: true })));
        return;
      }
      throw error;
    }
  }

  private async _manipulateDropModel(model_name: string) {
    model_name = inflector.camelize(model_name);
    const model_class = this.models[model_name];
    if (!model_class) {
      throw new Error(`model ${model_name} does not exist`);
    }
    await model_class.drop();
  }

  private async _manipulateDropAllModels() {
    await this.dropAllModels();
  }

  private async _manipulateFind(model_name: string, data: any) {
    model_name = inflector.camelize(inflector.singularize(model_name));
    const model_class = this.models[model_name];
    if (!model_class) {
      throw new Error(`model ${model_name} does not exist`);
    }
    return await model_class.where(data).exec({ skip_log: true });
  }

  private _manipulateConvertIds(id_to_record_map: { [id: string]: any }, model_name: string, data: any) {
    model_name = inflector.camelize(model_name);
    const model_class = this.models[model_name];
    if (!model_class) {
      return;
    }
    for (const column in model_class._schema) {
      const property = model_class._schema[column];
      if (property && property.record_id && Object.prototype.hasOwnProperty.call(data, column)) {
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
   * Adds a has-many association
   */
  private _hasMany(this_model: typeof BaseModel, target_model: typeof BaseModel, options?: AssociationHasManyOptions) {
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
    } as ColumnProperty);
    const integrity = (options && options.integrity) || 'ignore';
    target_model._integrities.push({ type: 'child_' + integrity, column: foreign_key, parent: this_model });
    this_model._integrities.push({ type: 'parent_' + integrity, column: foreign_key, child: target_model });
    const column = (options && options.as) || inflector.tableize(target_model._name);
    const columnCache = '__cache_' + column;
    const columnGetter = '__getter_' + column;
    this_model._associations[column] = { type: 'hasMany', target_model, foreign_key };
    Object.defineProperty(this_model.prototype, column, {
      get() {
        let getter: any;
        // getter must be created per instance due to __scope
        if (!Object.prototype.hasOwnProperty.call(this, columnGetter)) {
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
  private _hasOne(this_model: typeof BaseModel, target_model: typeof BaseModel, options?: AssociationHasOneOptions) {
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
    } as ColumnProperty);
    const integrity = (options && options.integrity) || 'ignore';
    target_model._integrities.push({ type: 'child_' + integrity, column: foreign_key, parent: this_model });
    this_model._integrities.push({ type: 'parent_' + integrity, column: foreign_key, child: target_model });
    const column = (options && options.as) || inflector.underscore(target_model._name);
    const columnCache = '__cache_' + column;
    const columnGetter = '__getter_' + column;
    this_model._associations[column] = { type: 'hasOne', target_model };
    Object.defineProperty(this_model.prototype, column, {
      get() {
        let getter: any;
        // getter must be created per instance due to __scope
        if (!Object.prototype.hasOwnProperty.call(this, columnGetter)) {
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
    this_model: typeof BaseModel,
    target_model: typeof BaseModel,
    options?: AssociationBelongsToOptions,
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
    } as ColumnProperty);
    const column = (options && options.as) || inflector.underscore(target_model._name);
    const columnCache = '__cache_' + column;
    const columnGetter = '__getter_' + column;
    this_model._associations[column] = { type: 'belongsTo', target_model };
    Object.defineProperty(this_model.prototype, column, {
      get() {
        let getter: any;
        // getter must be created per instance due to __scope
        if (!Object.prototype.hasOwnProperty.call(this, columnGetter)) {
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

  private async _fetchAssociatedBelongsTo(
    records: any,
    target_model: any,
    column: string,
    select: string | undefined,
    options: { lean?: boolean; transaction?: Transaction },
  ) {
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
          if (!Object.prototype.hasOwnProperty.call(record, column)) {
            if (options.lean) {
              record[column] = null;
            } else {
              Object.defineProperty(record, column, { enumerable: true, value: null });
            }
          }
        });
      } catch {
        //
      }
    } else {
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
          } else {
            Object.defineProperty(records, column, { enumerable: true, value: sub_record });
          }
        } catch (error: any) {
          if (error && error.message !== 'not found') {
            throw error;
          }
          if (!Object.prototype.hasOwnProperty.call(records, column)) {
            if (options.lean) {
              records[column] = null;
            } else {
              Object.defineProperty(records, column, { enumerable: true, value: null });
            }
          }
        }
      } else if (!Object.prototype.hasOwnProperty.call(records, column)) {
        if (options.lean) {
          records[column] = null;
        } else {
          Object.defineProperty(records, column, { enumerable: true, value: null });
        }
      }
    }
  }

  private async _fetchAssociatedHasMany(
    records: any,
    target_model: any,
    foreign_key: any,
    column: string,
    select: string | undefined,
    options: { lean?: boolean; transaction?: Transaction },
  ) {
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
        sub_records.forEach((sub_record: any) => {
          records.forEach((record) => {
            if (record.id === sub_record[foreign_key]) {
              record[column].push(sub_record);
            }
          });
        });
      } catch {
        //
      }
    } else {
      if (options.lean) {
        records[column] = [];
      } else {
        Object.defineProperty(records, column, { enumerable: true, value: [] });
      }
      const query = target_model.where(_.zipObject([foreign_key], [records.id]));
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
        sub_records.forEach((sub_record: any) => {
          return records[column].push(sub_record);
        });
      } catch {
        //
      }
    }
  }
}

export class MongoDBConnection extends Connection<MongoDBAdapter> {
  constructor(settings: ConnectionSettings & AdapterSettingsMongoDB) {
    super(createMongoDBAdapter, settings);
  }
}

export class MySQLConnection extends Connection<MySQLAdapter> {
  constructor(settings: ConnectionSettings & AdapterSettingsMySQL) {
    super(createMySQLAdapter, settings);
  }
}

export class PostgreSQLConnection extends Connection<PostgreSQLAdapter> {
  constructor(settings: ConnectionSettings & AdapterSettingsPostgreSQL) {
    super(createPostgreSQLAdapter, settings);
  }
}

export class SQLite3Connection extends Connection<SQLite3Adapter> {
  constructor(settings: ConnectionSettings & AdapterSettingsSQLite3) {
    super(createSQLite3Adapter, settings);
  }
}

export { Connection };
