import { ModelCache } from './cache';
import { ModelCallback } from './callback';
import { ModelPersistence } from './persistence';
import { ModelQuery } from './query';
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
    static newModel(connection: any, name: any, schema: any): {
        new (data: any): {
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
        newModel(connection: any, name: any, schema: any): any;
        connection(connection: any, name: any): string | undefined;
        _checkConnection(): any;
        _checkReady(): Promise<[any, any]>;
        _getKeyType(target_connection?: any): any;
        column(path: any, property: any): true | undefined;
        index(columns: any, options: any): boolean;
        drop(): Promise<any>;
        build(data: any): Model;
        _collapseNestedNulls(instance: any, selected_columns_raw: any, intermediates: any): (null | undefined)[];
        deleteAll(): Promise<any>;
        hasMany(target_model_or_column: any, options: any): void;
        hasOne(target_model_or_column: any, options: any): void;
        belongsTo(target_model_or_column: any, options: any): void;
        inspect(depth: any): string;
    };
    static connection(connection: any, name: any): string | undefined;
    static _checkConnection(): any;
    static _checkReady(): Promise<[any, any]>;
    static _getKeyType(target_connection?: any): any;
    static column(path: any, property: any): true | undefined;
    static index(columns: any, options: any): boolean;
    static drop(): Promise<any>;
    static build(data: any): Model;
    constructor(data: any);
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
