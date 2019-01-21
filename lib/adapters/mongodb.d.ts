/// <reference types="node" />
export interface IAdapterSettingsMongoDB {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database: string;
}
declare class CormoTypesObjectId {
}
import * as stream from 'stream';
import { Transaction } from '../transaction';
import { AdapterBase, ISchemas } from './base';
declare class MongoDBAdapter extends AdapterBase {
    key_type: any;
    key_type_internal: typeof CormoTypesObjectId;
    support_geopoint: boolean;
    support_nested: boolean;
    private _collections;
    private _db;
    private _client;
    constructor(connection: any);
    getSchemas(): Promise<ISchemas>;
    createTable(model: any): Promise<void>;
    createIndex(model: any, index: any): Promise<void>;
    drop(model: any): Promise<void>;
    idToDB(value: any): any;
    valueToDB(value: any, column: any, property: any): any;
    create(model: string, data: any, options: {
        transaction?: Transaction;
    }): Promise<any>;
    createBulk(model: string, data: any[], options: {
        transaction?: Transaction;
    }): Promise<any>;
    update(model: any, data: any, options: {
        transaction?: Transaction;
    }): Promise<void>;
    updatePartial(model: string, data: any, conditions: any, options: {
        transaction?: Transaction;
    }): Promise<number>;
    upsert(model: any, data: any, conditions: any, options: any): Promise<void>;
    findById(model: any, id: any, options: any): Promise<any>;
    find(model: any, conditions: any, options: any): Promise<any>;
    stream(model: any, conditions: any, options: any): stream.Readable;
    count(model: any, conditions: any, options: any): Promise<any>;
    delete(model: any, conditions: any): Promise<any>;
    /**
     * Connects to the database
     */
    connect(settings: IAdapterSettingsMongoDB): Promise<void>;
    close(): null;
    /**
     * Exposes mongodb module's a collection object
     */
    collection(model: any): any;
    protected _getModelID(data: any): any;
    protected valueToModel(value: any, property: any): any;
    private _buildSelect;
    private _collection;
    private _getTables;
    private _getSchema;
    private _getIndexes;
    private _buildUpdateOps;
    private _buildConditionsForFind;
}
declare const _default: (connection: any) => MongoDBAdapter;
export default _default;
