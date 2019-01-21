/// <reference types="node" />
export interface IAdapterSettingsSQLite3 {
    database: string;
}
import * as stream from 'stream';
import { Transaction } from '../transaction';
import { IAdapterCountOptions, IAdapterFindOptions, ISchemas } from './base';
import { SQLAdapterBase } from './sql_base';
declare class SQLite3Adapter extends SQLAdapterBase {
    key_type: any;
    native_integrity: boolean;
    protected _regexp_op: null;
    protected _false_value: string;
    private _client;
    private _settings;
    constructor(connection: any);
    getSchemas(): Promise<ISchemas>;
    createTable(model: string): Promise<void>;
    addColumn(model: string, column_property: any): Promise<void>;
    createIndex(model: string, index: any): Promise<void>;
    drop(model: string): Promise<void>;
    create(model: string, data: any, options: {
        transaction?: Transaction;
    }): Promise<any>;
    createBulk(model: string, data: any[], options: {
        transaction?: Transaction;
    }): Promise<any[]>;
    update(model: string, data: any, options: {
        transaction?: Transaction;
    }): Promise<void>;
    updatePartial(model: string, data: any, conditions: any, options: {
        transaction?: Transaction;
    }): Promise<number>;
    findById(model: string, id: any, options: {
        select?: string[];
        explain?: boolean;
        transaction?: Transaction;
    }): Promise<any>;
    find(model: string, conditions: any, options: IAdapterFindOptions): Promise<any>;
    stream(model: any, conditions: any, options: any): stream.Readable;
    count(model: string, conditions: any, options: IAdapterCountOptions): Promise<number>;
    delete(model: string, conditions: any, options: {
        transaction?: Transaction;
    }): Promise<number>;
    /**
     * Connects to the database
     */
    connect(settings: IAdapterSettingsSQLite3): Promise<void>;
    close(): void;
    getConnection(): Promise<any>;
    releaseConnection(adapter_connection: any): Promise<void>;
    startTransaction(adapter_connection: any): Promise<void>;
    commitTransaction(adapter_connection: any): Promise<void>;
    rollbackTransaction(adapter_connection: any): Promise<void>;
    /**
     * Exposes sqlite3 module's run method
     */
    run(): any;
    /**
     * Exposes sqlite3 module's all method
     */
    all(): any;
    protected valueToModel(value: any, property: any): any;
    protected _getModelID(data: any): number | null;
    private _getClient;
    private _getTables;
    private _getSchema;
    private _getIndexes;
    private _buildUpdateSetOfColumn;
    private _buildUpdateSet;
    private _buildPartialUpdateSet;
    private _buildSqlForFind;
}
declare const _default: (connection: any) => SQLite3Adapter;
export default _default;
