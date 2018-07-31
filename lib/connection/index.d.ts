/// <reference types="node" />
import { EventEmitter } from 'events';
import { Model } from '../model';
import { ConnectionAssociation } from './association';
import { ConnectionManipulate } from './manipulate';
import { AdapterBase } from '../adapters/base';
/**
 * Manages connection to a database
 * @uses ConnectionAssociation
 * @uses ConnectionManipulate
 */
declare class Connection extends EventEmitter implements ConnectionAssociation, ConnectionManipulate {
    /**
     * Indicates the adapter associated to this connection
     * @private
     * @see Connection::constructor
     */
    _adapter: AdapterBase;
    constructor(adapter_name: any, settings: any);
    close(): null;
    model(name: any, schema: any): {
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
        connection(connection: Connection, name: string): void;
        _checkConnection(): any;
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
    _checkSchemaApplied(): Promise<any>;
    _initializeModels(): void;
    _checkArchive(): void;
    _getModelNamesByAssociationOrder(): any;
    applySchemas(options: any): any;
    dropAllModels(): Promise<void>;
    log(model: any, type: any, data: any): void;
    _connectRedisCache(): any;
    inspect(depth: any): string;
    addAssociation(): void;
    getInconsistencies(): void;
    fetchAssociated(): void;
    manipulate(): void;
}
export { Connection };
