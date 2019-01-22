/// <reference types="node" />
import { EventEmitter } from 'events';
import { AdapterBase } from '../adapters/base';
import { IAdapterSettingsMongoDB } from '../adapters/mongodb';
import { IAdapterSettingsMySQL } from '../adapters/mysql';
import { IAdapterSettingsPostgreSQL } from '../adapters/postgresql';
import { IAdapterSettingsSQLite3 } from '../adapters/sqlite3';
import { ILogger } from '../logger';
import { BaseModel, IModelSchema, ModelValueObject } from '../model';
import { IQueryArray, IQuerySingle } from '../query';
import { IsolationLevel, Transaction } from '../transaction';
import * as types from '../types';
declare type ManipulateCommand = string | {
    [key: string]: any;
};
interface IConnectionSettings {
    is_default?: boolean;
    redis_cache?: {
        client?: object;
        host?: string;
        port?: number;
        database?: number;
    };
    logger?: 'console' | 'color-console' | ILogger;
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
interface IAssociation {
    type: 'hasMany' | 'hasOne' | 'belongsTo';
    this_model: typeof BaseModel;
    target_model_or_column: string | typeof BaseModel;
    options?: IAssociationHasManyOptions | IAssociationHasOneOptions | IAssociationBelongsToOptions;
}
interface ITxModelClass<M extends BaseModel> {
    create(data?: ModelValueObject<M>): Promise<M>;
    count(condition?: object): Promise<number>;
    find(id: types.RecordID): IQuerySingle<M>;
    find(id: types.RecordID[]): IQueryArray<M>;
    where(condition?: object): IQueryArray<M>;
}
/**
 * Manages connection to a database
 */
declare class Connection extends EventEmitter {
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
    _adapter: AdapterBase;
    /**
     * Model lists using this connection.
     * Maps from model name to model class
     * @see Connection::constructor
     */
    models: {
        [name: string]: typeof BaseModel;
    };
    private _promise_schema_applied?;
    private _pending_associations;
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
    /**
     * Set logger
     */
    setLogger(logger?: 'console' | 'color-console' | ILogger): void;
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
     * Drops all model tables
     */
    dropAllModels(): Promise<void>;
    /**
     * Logs
     */
    log(model: string, type: string, data: object): void;
    inspect(): string;
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
    fetchAssociated(records: any, column: any, select?: any, options?: any): Promise<void>;
    getTransaction(options?: {
        isolation_level?: IsolationLevel;
    }): Promise<Transaction>;
    transaction<T, M1 extends BaseModel>(options: {
        isolation_level?: IsolationLevel;
        models: [ITxModelClass<M1>];
    }, block: (m1: ITxModelClass<M1>, transaction: Transaction) => Promise<T>): Promise<T>;
    transaction<T>(options: {
        isolation_level?: IsolationLevel;
    }, block: (transaction: Transaction) => Promise<T>): Promise<T>;
    transaction<T>(block: (transaction: Transaction) => Promise<T>): Promise<T>;
    _checkSchemaApplied(): Promise<void>;
    _connectRedisCache(): any;
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
     * Applies pending associations
     */
    private _applyAssociations;
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
export { Connection };
