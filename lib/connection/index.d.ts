/// <reference types="node" />
import { EventEmitter } from 'events';
import { Model } from '../model';
import { ConnectionAssociation } from './association';
import { ConnectionManipulate } from './manipulate';
/**
 * Manages connection to a database
 * @uses ConnectionAssociation
 * @uses ConnectionManipulate
 */
declare class Connection extends EventEmitter implements ConnectionAssociation, ConnectionManipulate {
    constructor(adapter_name: any, settings: any);
    close(): null;
    model(name: any, schema: any): {
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
        dirty_tracking: boolean;
        archive: boolean;
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
