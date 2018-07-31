/// <reference types="node" />
import { EventEmitter } from 'events';
import { Model } from '../model';
import { AdapterBase } from '../adapters/base';
import { IAdapterSettingsMongoDB } from '../adapters/mongodb';
import { IAdapterSettingsMySQL } from '../adapters/mysql';
import { IAdapterSettingsPostgreSQL } from '../adapters/postgresql';
import { IAdapterSettingsSQLite3 } from '../adapters/sqlite3';
import { ConnectionAssociation } from './association';
import { ConnectionManipulate } from './manipulate';
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
 * @uses ConnectionAssociation
 * @uses ConnectionManipulate
 */
declare class Connection extends EventEmitter implements ConnectionAssociation, ConnectionManipulate {
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
    model(name: string, schema: object): {
        new (data?: object | undefined): {
            _runCallbacks(name: import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallbackName, type: import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallbackType): void;
            save(options?: {
                skip_log?: boolean | undefined;
                validate?: boolean | undefined;
            }): Promise<any>;
            isDirty(): boolean;
            getChanged(): string[];
            get(path: any): any;
            getPrevious(path: any): any;
            set(path: any, value: any): any;
            reset(): {};
            destroy(): Promise<any>;
            _defineProperty(object: any, key: any, path: any, enumerable: any): any;
        };
        dirty_tracking: boolean;
        archive: boolean;
        lean_query: boolean;
        tableName: string;
        _connection: Connection;
        _adapter: AdapterBase;
        _name: string;
        _loadFromCache(key: string, refresh?: boolean | undefined): Promise<any>;
        _saveToCache(key: string, ttl: number, data: any): Promise<void>;
        removeCache(key: string): Promise<void>;
        afterInitialize(method: import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallbackMethod): void;
        afterFind(method: import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallbackMethod): void;
        beforeSave(this: typeof Model & typeof import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallback, method: import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallbackMethod): void;
        afterSave(this: typeof Model & typeof import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallback, method: import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallbackMethod): void;
        beforeCreate(this: typeof Model & typeof import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallback, method: import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallbackMethod): void;
        afterCreate(this: typeof Model & typeof import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallback, method: import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallbackMethod): void;
        beforeUpdate(this: typeof Model & typeof import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallback, method: import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallbackMethod): void;
        afterUpdate(this: typeof Model & typeof import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallback, method: import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallbackMethod): void;
        beforeDestroy(this: typeof Model & typeof import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallback, method: import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallbackMethod): void;
        afterDestroy(this: typeof Model & typeof import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallback, method: import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallbackMethod): void;
        beforeValidate(this: typeof Model & typeof import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallback, method: import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallbackMethod): void;
        afterValidate(this: typeof Model & typeof import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallback, method: import("../../../../../../Users/zigzag/work/cormo/src/model/callback").ModelCallbackMethod): void;
        create<T extends Model, U extends T>(this: new () => T, data?: U | undefined, options?: {
            skip_log: boolean;
        } | undefined): Promise<T>;
        createBulk<T extends Model, U extends T>(this: new () => T, data?: U[] | undefined): Promise<T[]>;
        query<T extends Model>(this: new () => T): import("../../../../../../Users/zigzag/work/cormo/src/query").IQueryArray<T>;
        find<T extends Model>(this: new () => T, id: string | number): import("../../../../../../Users/zigzag/work/cormo/src/query").IQuerySingle<T>;
        find<T extends Model>(this: new () => T, id: (string | number)[]): import("../../../../../../Users/zigzag/work/cormo/src/query").IQueryArray<T>;
        findPreserve<T extends Model>(this: new () => T, ids: (string | number)[]): import("../../../../../../Users/zigzag/work/cormo/src/query").IQueryArray<T>;
        where<T extends Model>(this: new () => T, condition?: object | undefined): import("../../../../../../Users/zigzag/work/cormo/src/query").IQueryArray<T>;
        select<T extends Model>(this: new () => T, columns: string): import("../../../../../../Users/zigzag/work/cormo/src/query").IQueryArray<T>;
        order<T extends Model>(this: new () => T, orders: string): import("../../../../../../Users/zigzag/work/cormo/src/query").IQueryArray<T>;
        _createQueryAndRun<T extends Model>(criteria: import("../../../../../../Users/zigzag/work/cormo/src/model/query").ModelQueryMethod, data: any): import("../../../../../../Users/zigzag/work/cormo/src/query").Query<T>;
        _createOptionalQueryAndRun<T extends Model>(criteria: import("../../../../../../Users/zigzag/work/cormo/src/model/query").ModelQueryMethod, data: any): import("../../../../../../Users/zigzag/work/cormo/src/query").Query<T>;
        newModel(connection: Connection, name: string, schema: object): any;
        connection(connection: Connection, name?: string | undefined): void;
        _checkConnection(): void;
        _checkReady(): Promise<[any, any]>;
        column(path: any, property: any): true | undefined;
        index(columns: any, options: any): boolean;
        drop(): Promise<void>;
        build<T extends Model, U extends T>(this: new (data?: U | undefined) => T, data?: U | undefined): T;
        deleteAll(): Promise<any>;
        hasMany(target_model_or_column: any, options: any): void;
        hasOne(target_model_or_column: any, options: any): void;
        belongsTo(target_model_or_column: any, options: any): void;
        inspect(depth: any): string;
        _getKeyType(target_connection?: Connection): any;
        _collapseNestedNulls(instance: any, selected_columns_raw: any, intermediates: any): (null | undefined)[];
    };
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
    addAssociation(): void;
    getInconsistencies(): void;
    fetchAssociated(): void;
    manipulate(): void;
    private _checkSchemaApplied;
    private _initializeModels;
    private _checkArchive;
    private _getModelNamesByAssociationOrder;
    private _connectRedisCache;
}
export { Connection };
