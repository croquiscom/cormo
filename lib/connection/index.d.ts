/// <reference types="node" />
import { EventEmitter } from 'events';
import { AdapterBase } from '../adapters/base';
import { IAdapterSettingsMongoDB } from '../adapters/mongodb';
import { IAdapterSettingsMySQL } from '../adapters/mysql';
import { IAdapterSettingsPostgreSQL } from '../adapters/postgresql';
import { IAdapterSettingsSQLite3 } from '../adapters/sqlite3';
import { Model } from '../model';
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
        [name: string]: typeof Model;
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
    constructor(adapter_name: 'mongodb', settings: IConnectionSettings & IAdapterSettingsMongoDB);
    constructor(adapter_name: 'mysql', settings: IConnectionSettings & IAdapterSettingsMySQL);
    constructor(adapter_name: 'postgresql', settings: IConnectionSettings & IAdapterSettingsPostgreSQL);
    constructor(adapter_name: 'sqlite3', settings: IConnectionSettings & IAdapterSettingsSQLite3);
    constructor(adapter_name: 'sqlite3_memory', settings: IConnectionSettings);
    /**
     * Closes this connection.
     * A closed connection can be used no more.
     */
    close(): void;
    /**
     * Creates a model class
     */
    model(name: string, schema: any): typeof Model;
    /**
     * Applies schemas
     * @see AdapterBase::applySchema
     */
    applySchemas(options?: {
        verbose?: boolean;
    }): Promise<any>;
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
    manipulate(commands: ManipulateCommand[]): Promise<any>;
    /**
     * Adds an association
     * @see Model.hasMany
     * @see Model.belongsTo
     */
    addAssociation(association: any): void;
    /**
     * Returns inconsistent records against associations
     */
    getInconsistencies(): Promise<any>;
    /**
     * Fetches associated records
     */
    fetchAssociated(records: any, column: any, select: any, options: any): Promise<void>;
    _checkSchemaApplied(): Promise<any>;
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
