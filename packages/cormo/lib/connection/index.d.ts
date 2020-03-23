/// <reference types="node" />
import { EventEmitter } from 'events';
import { inspect } from 'util';
import { AdapterBase } from '../adapters/base';
import { createAdapter as createMongoDBAdapter, IAdapterSettingsMongoDB, MongoDBAdapter } from '../adapters/mongodb';
import { createAdapter as createMySQLAdapter, IAdapterSettingsMySQL, MySQLAdapter } from '../adapters/mysql';
import { createAdapter as createPostgreSQLAdapter, IAdapterSettingsPostgreSQL, PostgreSQLAdapter } from '../adapters/postgresql';
import { createAdapter as createSQLite3Adapter, IAdapterSettingsSQLite3, SQLite3Adapter } from '../adapters/sqlite3';
import { ILogger } from '../logger';
import { BaseModel, IModelSchema, ModelColumnNamesWithId, ModelValueObject } from '../model';
import { IQueryArray, IQuerySingle } from '../query';
import { IsolationLevel, Transaction } from '../transaction';
import * as types from '../types';
declare type ManipulateCommand = string | {
    [key: string]: any;
};
interface IRedisCacheSettings {
    client?: object;
    host?: string;
    port?: number;
    database?: number;
}
interface IConnectionSettings {
    is_default?: boolean;
    redis_cache?: IRedisCacheSettings;
    implicit_apply_schemas?: boolean;
    logger?: 'console' | 'color-console' | 'empty' | ILogger;
}
declare type AssociationIntegrityType = 'ignore' | 'nullify' | 'restrict' | 'delete';
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
export interface ISchemaChange {
    message: string;
}
interface IAssociation {
    type: 'hasMany' | 'hasOne' | 'belongsTo';
    this_model: typeof BaseModel;
    target_model_or_column: string | typeof BaseModel;
    options?: IAssociationHasManyOptions | IAssociationHasOneOptions | IAssociationBelongsToOptions;
}
interface ITxModelClass<M extends BaseModel> {
    new (data?: object): M;
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
    group<G extends ModelColumnNamesWithId<M>, F>(group_by: G | G[], fields?: F): IQueryArray<M, {
        [field in keyof F]: number;
    } & Pick<M, G>>;
    group<F>(group_by: null, fields?: F): IQueryArray<M, {
        [field in keyof F]: number;
    }>;
    group<U>(group_by: string | null, fields?: object): IQueryArray<M, U>;
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
    models: {
        [name: string]: typeof BaseModel;
    };
    [name: string]: any;
    /**
     * Creates a connection
     * @see MySQLAdapter::connect
     * @see MongoDBAdapter::connect
     * @see PostgreSQLAdapter::connect
     * @see SQLite3Adapter::connect
     * @see RedisAdapter::connect
     */
    constructor(adapter: 'mongodb' | typeof createMongoDBAdapter, settings: IConnectionSettings & IAdapterSettingsMongoDB);
    constructor(adapter: 'mysql' | typeof createMySQLAdapter, settings: IConnectionSettings & IAdapterSettingsMySQL);
    constructor(adapter: 'postgresql' | typeof createPostgreSQLAdapter, settings: IConnectionSettings & IAdapterSettingsPostgreSQL);
    constructor(adapter: 'sqlite3' | typeof createSQLite3Adapter, settings: IConnectionSettings & IAdapterSettingsSQLite3);
    constructor(adapter: 'sqlite3_memory' | typeof createSQLite3Adapter, settings: IConnectionSettings);
    /**
     * Set logger
     */
    setLogger(logger?: 'console' | 'color-console' | 'empty' | ILogger): void;
    /**
     * Closes this connection.
     * A closed connection can be used no more.
     */
    close(): void;
    /**
     * Creates a model class
     */
    model(name: string, schema: IModelSchema): typeof BaseModel;
    /**
     * Applies schemas
     * @see AdapterBase::applySchema
     */
    applySchemas(options?: {
        verbose?: boolean;
    }): Promise<void>;
    isApplyingSchemasNecessary(): Promise<boolean>;
    /**
     * Returns changes of schama
     * @see AdapterBase::applySchema
     */
    getSchemaChanges(): Promise<ISchemaChange[]>;
    /**
     * Drops all model tables
     */
    dropAllModels(): Promise<void>;
    /**
     * Logs
     */
    log(model: string, type: string, data: object): void;
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
    addAssociation(association: IAssociation): void;
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
        models: [ITxModelClass<M1>];
    }, block: (m1: ITxModelClass<M1>, transaction: Transaction) => Promise<T>): Promise<T>;
    transaction<T, M1 extends BaseModel, M2 extends BaseModel>(options: {
        isolation_level?: IsolationLevel;
        models: [ITxModelClass<M1>, ITxModelClass<M2>];
    }, block: (m1: ITxModelClass<M1>, m2: ITxModelClass<M2>, transaction: Transaction) => Promise<T>): Promise<T>;
    transaction<T, M1 extends BaseModel, M2 extends BaseModel, M3 extends BaseModel>(options: {
        isolation_level?: IsolationLevel;
        models: [ITxModelClass<M1>, ITxModelClass<M2>, ITxModelClass<M3>];
    }, block: (m1: ITxModelClass<M1>, m2: ITxModelClass<M2>, m3: ITxModelClass<M3>, transaction: Transaction) => Promise<T>): Promise<T>;
    transaction<T, M1 extends BaseModel, M2 extends BaseModel, M3 extends BaseModel, M4 extends BaseModel>(options: {
        isolation_level?: IsolationLevel;
        models: [ITxModelClass<M1>, ITxModelClass<M2>, ITxModelClass<M3>, ITxModelClass<M4>];
    }, block: (m1: ITxModelClass<M1>, m2: ITxModelClass<M2>, m3: ITxModelClass<M3>, m4: ITxModelClass<M4>, transaction: Transaction) => Promise<T>): Promise<T>;
    transaction<T, M1 extends BaseModel, M2 extends BaseModel, M3 extends BaseModel, M4 extends BaseModel, M5 extends BaseModel>(options: {
        isolation_level?: IsolationLevel;
        models: [ITxModelClass<M1>, ITxModelClass<M2>, ITxModelClass<M3>, ITxModelClass<M4>, ITxModelClass<M4>];
    }, block: (m1: ITxModelClass<M1>, m2: ITxModelClass<M2>, m3: ITxModelClass<M3>, m4: ITxModelClass<M4>, m5: ITxModelClass<M5>, transaction: Transaction) => Promise<T>): Promise<T>;
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
    constructor(settings: IConnectionSettings & IAdapterSettingsMongoDB);
}
export declare class MySQLConnection extends Connection<MySQLAdapter> {
    constructor(settings: IConnectionSettings & IAdapterSettingsMySQL);
}
export declare class PostgreSQLConnection extends Connection<PostgreSQLAdapter> {
    constructor(settings: IConnectionSettings & IAdapterSettingsPostgreSQL);
}
export declare class SQLite3Connection extends Connection<SQLite3Adapter> {
    constructor(settings: IConnectionSettings & IAdapterSettingsSQLite3);
}
export { Connection };
