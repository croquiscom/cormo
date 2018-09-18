import { AdapterBase } from '../adapters/base';
import { Connection } from '../connection';
import { IQueryArray, IQuerySingle, Query } from '../query';
import * as types from '../types';
import { ModelCache } from './cache';
import { ModelCallback, ModelCallbackMethod, ModelCallbackName, ModelCallbackType } from './callback';
import { ModelPersistence } from './persistence';
import { ModelQuery, ModelQueryMethod } from './query';
import { ModelTimestamp } from './timestamp';
import { ModelValidate } from './validate';
/**
 * Base class for models
 * @uses ModelCache
 * @uses ModelCallback
 * @uses ModelPersistence
 * @uses ModelQuery
 * @uses ModelTimestamp
 * @uses ModelValidate
 */
declare class Model implements ModelCache, ModelCallback, ModelPersistence, ModelQuery, ModelTimestamp, ModelValidate {
    /**
     * Tracks changes of a record if true
     */
    static dirty_tracking: boolean;
    /**
     * Archives deleted records in the archive table
     */
    static archive: boolean;
    /**
     * Applies the lean option for all queries for this Model
     */
    static lean_query: boolean;
    static tableName: string;
    /**
     * Indicates the connection associated to this model
     * @see Model.connection
     * @private
     */
    static _connection: Connection;
    /**
     * Indicates the adapter associated to this model
     * @private
     * @see Model.connection
     */
    static _adapter: AdapterBase;
    static _name: string;
    static _schema: any;
    static _indexes: any[];
    static _integrities: any[];
    static _associations: {
        [column: string]: any;
    };
    static _initialize_called: boolean;
    static initialize(): void;
    static _loadFromCache(key: string, refresh?: boolean): Promise<any>;
    static _saveToCache(key: string, ttl: number, data: any): Promise<void>;
    static removeCache(key: string): Promise<void>;
    static afterInitialize(method: ModelCallbackMethod): void;
    static afterFind(method: ModelCallbackMethod): void;
    static beforeSave(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
    static afterSave(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
    static beforeCreate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
    static afterCreate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
    static beforeUpdate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
    static afterUpdate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
    static beforeDestroy(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
    static afterDestroy(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
    static beforeValidate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
    static afterValidate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
    static create<T extends Model, U extends T>(this: {
        new (): T;
    }, data?: U, options?: {
        skip_log: boolean;
    }): Promise<T>;
    static createBulk<T extends Model, U extends T>(this: {
        new (): T;
    }, data?: U[]): Promise<T[]>;
    static query<T extends Model>(this: {
        new (): T;
    }): IQueryArray<T>;
    static find<T extends Model>(this: {
        new (): T;
    }, id: types.RecordID): IQuerySingle<T>;
    static find<T extends Model>(this: {
        new (): T;
    }, id: types.RecordID[]): IQueryArray<T>;
    static findPreserve<T extends Model>(this: {
        new (): T;
    }, ids: types.RecordID[]): IQueryArray<T>;
    static where<T extends Model>(this: {
        new (): T;
    }, condition?: object): IQueryArray<T>;
    static select<T extends Model>(this: {
        new (): T;
    }, columns: string): IQueryArray<T>;
    static order<T extends Model>(this: {
        new (): T;
    }, orders: string): IQueryArray<T>;
    static _createQueryAndRun<T extends Model>(criteria: ModelQueryMethod, data: any): Query<T>;
    static _createOptionalQueryAndRun<T extends Model>(criteria: ModelQueryMethod, data: any): Query<T>;
    /**
     * Returns a new model class extending Model
     */
    static newModel(connection: Connection, name: string, schema: any): typeof Model;
    /**
     * Sets a connection of this model
     *
     * If this methods was not called explicitly, this model will use Connection.defaultConnection
     */
    static connection(connection: Connection, name?: string): void;
    static _checkConnection(): void;
    static _checkReady(): Promise<[any, any]>;
    static column(path: any, property: any): true | undefined;
    static index(columns: any, options: any): boolean;
    static drop(): Promise<void>;
    /**
     * Creates a record.
     * 'Model.build(data)' is the same as 'new Model(data)'
     */
    static build<T extends Model, U extends T>(this: {
        new (data?: U): T;
    }, data?: U): T;
    /**
     * Deletes all records from the database
     */
    static deleteAll(): Promise<any>;
    /**
     * Adds a has-many association
     * @param {Class<Model>|String} target_model_or_column
     * @param {Object} [options]
     * @param {String} [options.type]
     * @param {String} [options.as]
     * @param {String} [options.foreign_key]
     * @param {String} [options.integrity='ignore'] 'ignore', 'nullify', 'restrict', or 'delete'
     */
    static hasMany(target_model_or_column: any, options: any): void;
    /**
     * Adds a has-one association
     * @param {Class<Model>|String} target_model_or_column
     * @param {Object} [options]
     * @param {String} [options.type]
     * @param {String} [options.as]
     * @param {String} [options.foreign_key]
     * @param {String} [options.integrity='ignore'] 'ignore', 'nullify', 'restrict', or 'delete'
     */
    static hasOne(target_model_or_column: any, options: any): void;
    /**
     * Adds a belongs-to association
     * @param {Class<Model>|String} target_model_or_column
     * @param {Object} [options]
     * @param {String} [options.type]
     * @param {String} [options.as]
     * @param {String} [options.foreign_key]
     * @param {Boolean} [options.required]
     */
    static belongsTo(target_model_or_column: any, options: any): void;
    static inspect(depth: any): string;
    static _getKeyType(target_connection?: Connection): any;
    /**
     * Set nested object null if all children are null
     */
    static _collapseNestedNulls(instance: any, selected_columns_raw: any, intermediates: any): (null | undefined)[];
    /**
     * Creates a record
     */
    constructor(data?: object);
    _runCallbacks(name: ModelCallbackName, type: ModelCallbackType): void;
    save(options?: {
        skip_log?: boolean;
        validate?: boolean;
    }): Promise<this>;
    /**
     * Returns true if there is some changed columns
     */
    isDirty(): boolean;
    /**
     * Returns the list of paths of changed columns
     */
    getChanged(): string[];
    /**
     * Returns the current value of the column of the given path
     * @param {String} path
     * @return {*}
     */
    get(path: any): any;
    /**
     * Returns the original value of the column of the given path
     * @param {String} path
     * @return {*}
     */
    getPrevious(path: any): any;
    /**
     * Changes the value of the column of the given path
     * @param {String} path
     * @param {*} value
     * @return {*}
     */
    set(path: any, value: any): any;
    /**
     * Resets all changes
     */
    reset(): {};
    /**
     * Destroys this record (remove from the database)
     */
    destroy(): Promise<any>;
    _defineProperty(object: any, key: any, path: any, enumerable: any): any;
}
export { Model };
