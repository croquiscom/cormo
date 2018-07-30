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
    _runCallbacks(name: ModelCallbackName, type: ModelCallbackType): void;
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
    static newModel(connection: any, name: any, schema: any): {
        new (data?: object | undefined): {
            _runCallbacks(name: ModelCallbackName, type: ModelCallbackType): void;
            _defineProperty(object: any, key: any, path: any, enumerable: any): any;
            isDirty(): boolean;
            getChanged(): string[];
            get(path: any): any;
            getPrevious(path: any): any;
            set(path: any, value: any): any;
            reset(): {};
            destroy(): Promise<any>;
        };
        /**
         * Tracks changes of a record if true
         */
        dirty_tracking: boolean;
        /**
         * Archives deleted records in the archive table
         */
        archive: boolean;
        /**
         * Applies the lean option for all queries for this Model
         */
        lean_query: boolean;
        tableName: string;
        /**
         * Indicates the connection associated to this model
         * @see Model.connection
         * @private
         */
        _connection: Connection;
        /**
         * Indicates the adapter associated to this model
         * @private
         * @see Model.connection
         */
        _adapter: AdapterBase;
        _name: string;
        _loadFromCache(key: string, refresh?: boolean | undefined): Promise<any>;
        _saveToCache(key: string, ttl: number, data: any): Promise<void>;
        removeCache(key: string): Promise<void>;
        afterInitialize(method: ModelCallbackMethod): void;
        afterFind(method: ModelCallbackMethod): void;
        beforeSave(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
        afterSave(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
        beforeCreate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
        afterCreate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
        beforeUpdate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
        afterUpdate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
        beforeDestroy(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
        afterDestroy(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
        beforeValidate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
        afterValidate(this: typeof Model & typeof ModelCallback, method: ModelCallbackMethod): void;
        query<T extends Model>(this: new () => T): IQueryArray<T>;
        find<T extends Model>(this: new () => T, id: string | number): IQuerySingle<T>;
        find<T extends Model>(this: new () => T, id: (string | number)[]): IQueryArray<T>;
        findPreserve<T extends Model>(this: new () => T, ids: (string | number)[]): IQueryArray<T>;
        where<T extends Model>(this: new () => T, condition?: object | undefined): IQueryArray<T>;
        select<T extends Model>(this: new () => T, columns: string): IQueryArray<T>;
        order<T extends Model>(this: new () => T, orders: string): IQueryArray<T>;
        _createQueryAndRun<T extends Model>(criteria: ModelQueryMethod, data: any): Query<T>;
        _createOptionalQueryAndRun<T extends Model>(criteria: ModelQueryMethod, data: any): Query<T>;
        newModel(connection: any, name: any, schema: any): any;
        connection(connection: any, name: any): void;
        _checkConnection(): any;
        _checkReady(): Promise<[any, any]>;
        _getKeyType(target_connection?: Connection): any;
        column(path: any, property: any): true | undefined;
        index(columns: any, options: any): boolean;
        drop(): Promise<void>;
        build(data: any): Model;
        _collapseNestedNulls(instance: any, selected_columns_raw: any, intermediates: any): (null | undefined)[];
        deleteAll(): Promise<any>;
        hasMany(target_model_or_column: any, options: any): void;
        hasOne(target_model_or_column: any, options: any): void;
        belongsTo(target_model_or_column: any, options: any): void;
        inspect(depth: any): string;
    };
    static connection(connection: any, name: any): void;
    static _checkConnection(): any;
    static _checkReady(): Promise<[any, any]>;
    static _getKeyType(target_connection?: Connection): any;
    static column(path: any, property: any): true | undefined;
    static index(columns: any, options: any): boolean;
    static drop(): Promise<void>;
    static build(data: any): Model;
    constructor(data?: object);
    static _collapseNestedNulls(instance: any, selected_columns_raw: any, intermediates: any): (null | undefined)[];
    _defineProperty(object: any, key: any, path: any, enumerable: any): any;
    isDirty(): boolean;
    getChanged(): string[];
    get(path: any): any;
    getPrevious(path: any): any;
    set(path: any, value: any): any;
    reset(): {};
    destroy(): Promise<any>;
    static deleteAll(): Promise<any>;
    static hasMany(target_model_or_column: any, options: any): void;
    static hasOne(target_model_or_column: any, options: any): void;
    static belongsTo(target_model_or_column: any, options: any): void;
    static inspect(depth: any): string;
}
export { Model };
