/// <reference types="node" />
/// <reference types="node" />
import { EventEmitter } from 'events';
import { inspect } from 'util';
import { AdapterBase } from '../adapters/base';
import { createAdapter as createMongoDBAdapter, AdapterSettingsMongoDB, MongoDBAdapter } from '../adapters/mongodb';
import { createAdapter as createMySQLAdapter, AdapterSettingsMySQL, MySQLAdapter } from '../adapters/mysql';
import { createAdapter as createPostgreSQLAdapter, AdapterSettingsPostgreSQL, PostgreSQLAdapter } from '../adapters/postgresql';
import { createAdapter as createSQLite3Adapter, AdapterSettingsSQLite3, SQLite3Adapter } from '../adapters/sqlite3';
import { Logger } from '../logger';
import { BaseModel, ModelSchema, ModelColumnNamesWithId, ModelValueObject } from '../model';
import { QueryArray, QuerySingle } from '../query';
import { IsolationLevel, Transaction } from '../transaction';
import * as types from '../types';
type ManipulateCommand = string | {
    [key: string]: any;
};
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
export interface MongoDBConnectionSettings extends ConnectionSettings, AdapterSettingsMongoDB {
}
export interface MySQLConnectionSettings extends ConnectionSettings, AdapterSettingsMySQL {
}
export interface PostgreSQLConnectionSettings extends ConnectionSettings, AdapterSettingsPostgreSQL {
}
export interface SQLite3ConnectionSettings extends ConnectionSettings, AdapterSettingsSQLite3 {
}
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
    ignorable?: boolean;
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
    group<G extends ModelColumnNamesWithId<M>, F>(group_by: G | G[], fields?: F): QueryArray<M, {
        [field in keyof F]: number;
    } & Pick<M, G>>;
    group<F>(group_by: null, fields?: F): QueryArray<M, {
        [field in keyof F]: number;
    }>;
    group<U>(group_by: string | null, fields?: object): QueryArray<M, U>;
}
/**
 * Manages connection to a database
 */
declare class Connection<AdapterType extends AdapterBase = AdapterBase> extends EventEmitter {
    /**
     * Default connection
     * @see Connection::constructor
     */
    static defaultConnection?: Connection;
    /**
     * Indicates the adapter associated to this connection
     * @private
     * @see Connection::constructor
     */
    _adapter: AdapterType;
    get adapter(): AdapterType;
    /**
     * Model lists using this connection.
     * Maps from model name to model class
     * @see Connection::constructor
     */
    models: Partial<{
        [name: string]: typeof BaseModel;
    }>;
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
    /**
     * Set logger
     */
    setLogger(logger?: 'console' | 'color-console' | 'empty' | Logger): void;
    /**
     * Closes this connection.
     * A closed connection can be used no more.
     */
    close(): void;
    /**
     * Creates a model class
     */
    model(name: string, schema: ModelSchema): typeof BaseModel;
    /**
     * Applies schemas
     * @see AdapterBase::applySchema
     */
    applySchemas(options?: {
        verbose?: boolean;
        apply_description_change?: boolean;
    }): Promise<void>;
    isApplyingSchemasNecessary(): Promise<boolean>;
    /**
     * Returns changes of schama
     * @see AdapterBase::applySchema
     */
    getSchemaChanges(): Promise<SchemaChange[]>;
    /**
     * Drops all model tables
     */
    dropAllModels(): Promise<void>;
    /**
     * Logs
     */
    log(model_name: string, type: string, data: object): void;
    [inspect.custom](): string;
    /**
     * Manipulate data
     */
    manipulate(commands: ManipulateCommand[]): Promise<{
        [id: string]: any;
    }>;
    /**
     * Adds an association
     * @see BaseModel.hasMany
     * @see BaseModel.belongsTo
     */
    addAssociation(association: Association): void;
    /**
     * Returns inconsistent records against associations
     */
    getInconsistencies(): Promise<any>;
    /**
     * Fetches associated records
     */
    fetchAssociated(records: any, column: string, select?: string, options?: {
        lean?: boolean;
        model?: typeof BaseModel;
        transaction?: Transaction;
    }): Promise<void>;
    /**
     * Applies pending associations
     */
    applyAssociations(): void;
    getTransaction(options?: {
        isolation_level?: IsolationLevel;
    }): Promise<Transaction>;
    transaction<T, M1 extends BaseModel>(options: {
        isolation_level?: IsolationLevel;
        models: [TxModelClass<M1>];
    }, block: (m1: TxModelClass<M1>, transaction: Transaction) => Promise<T>): Promise<T>;
    transaction<T, M1 extends BaseModel, M2 extends BaseModel>(options: {
        isolation_level?: IsolationLevel;
        models: [TxModelClass<M1>, TxModelClass<M2>];
    }, block: (m1: TxModelClass<M1>, m2: TxModelClass<M2>, transaction: Transaction) => Promise<T>): Promise<T>;
    transaction<T, M1 extends BaseModel, M2 extends BaseModel, M3 extends BaseModel>(options: {
        isolation_level?: IsolationLevel;
        models: [TxModelClass<M1>, TxModelClass<M2>, TxModelClass<M3>];
    }, block: (m1: TxModelClass<M1>, m2: TxModelClass<M2>, m3: TxModelClass<M3>, transaction: Transaction) => Promise<T>): Promise<T>;
    transaction<T, M1 extends BaseModel, M2 extends BaseModel, M3 extends BaseModel, M4 extends BaseModel>(options: {
        isolation_level?: IsolationLevel;
        models: [TxModelClass<M1>, TxModelClass<M2>, TxModelClass<M3>, TxModelClass<M4>];
    }, block: (m1: TxModelClass<M1>, m2: TxModelClass<M2>, m3: TxModelClass<M3>, m4: TxModelClass<M4>, transaction: Transaction) => Promise<T>): Promise<T>;
    transaction<T, M1 extends BaseModel, M2 extends BaseModel, M3 extends BaseModel, M4 extends BaseModel, M5 extends BaseModel>(options: {
        isolation_level?: IsolationLevel;
        models: [TxModelClass<M1>, TxModelClass<M2>, TxModelClass<M3>, TxModelClass<M4>, TxModelClass<M4>];
    }, block: (m1: TxModelClass<M1>, m2: TxModelClass<M2>, m3: TxModelClass<M3>, m4: TxModelClass<M4>, m5: TxModelClass<M5>, transaction: Transaction) => Promise<T>): Promise<T>;
    transaction<T>(options: {
        isolation_level?: IsolationLevel;
    }, block: (transaction: Transaction) => Promise<T>): Promise<T>;
    transaction<T>(block: (transaction: Transaction) => Promise<T>): Promise<T>;
    _checkSchemaApplied(): Promise<void>;
    _connectRedisCache(): any;
    private _connect;
    private _initializeModels;
    private _checkArchive;
    private _getModelNamesByAssociationOrder;
    private _manipulateCreate;
    private _manipulateDelete;
    private _manipulateDeleteAllModels;
    private _manipulateDropModel;
    private _manipulateDropAllModels;
    private _manipulateFind;
    private _manipulateConvertIds;
    /**
     * Adds a has-many association
     */
    private _hasMany;
    /**
     * Adds a has-one association
     */
    private _hasOne;
    /**
     * Adds a belongs-to association
     */
    private _belongsTo;
    private _fetchAssociatedBelongsTo;
    private _fetchAssociatedHasMany;
}
export declare class MongoDBConnection extends Connection<MongoDBAdapter> {
    constructor(settings: ConnectionSettings & AdapterSettingsMongoDB);
}
export declare class MySQLConnection extends Connection<MySQLAdapter> {
    constructor(settings: ConnectionSettings & AdapterSettingsMySQL);
}
export declare class PostgreSQLConnection extends Connection<PostgreSQLAdapter> {
    constructor(settings: ConnectionSettings & AdapterSettingsPostgreSQL);
}
export declare class SQLite3Connection extends Connection<SQLite3Adapter> {
    constructor(settings: ConnectionSettings & AdapterSettingsSQLite3);
}
export { Connection };
