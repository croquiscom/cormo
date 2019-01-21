/// <reference types="node" />
export interface IAdapterSettingsMySQL {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database: string;
    charset?: string;
    collation?: string;
    pool_size?: number;
}
import * as stream from 'stream';
import { Transaction } from '../transaction';
import { ISchemas } from './base';
import { SQLAdapterBase } from './sql_base';
declare class MySQLAdapter extends SQLAdapterBase {
    key_type: any;
    support_geopoint: boolean;
    support_string_type_with_length: boolean;
    native_integrity: boolean;
    protected _escape_ch: string;
    private _client;
    private _database?;
    private _settings?;
    constructor(connection: any);
    getSchemas(): Promise<ISchemas>;
    createTable(model: string): Promise<void>;
    addColumn(model: string, column_property: any): Promise<void>;
    createIndex(model: string, index: any): Promise<void>;
    createForeignKey(model: string, column: string, type: string, references: any): Promise<void>;
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
    upsert(model: string, data: any, conditions: any, options: any): Promise<void>;
    findById(model: any, id: any, options: any): Promise<any>;
    find(model: any, conditions: any, options: any): Promise<any>;
    stream(model: any, conditions: any, options: any): stream.Readable;
    count(model: any, conditions: any, options: any): Promise<number>;
    delete(model: any, conditions: any): Promise<number>;
    /**
     * Connects to the database
     */
    connect(settings: IAdapterSettingsMySQL): Promise<void>;
    close(): void;
    getConnection(): Promise<any>;
    releaseConnection(adapter_connection: any): Promise<void>;
    startTransaction(adapter_connection: any): Promise<void>;
    commitTransaction(adapter_connection: any): Promise<void>;
    rollbackTransaction(adapter_connection: any): Promise<void>;
    /**
     * Exposes mysql module's query method
     */
    query(text: string, values?: any[], adapter_connection?: any): Promise<any>;
    protected valueToModel(value: any, property: any): any;
    protected _getModelID(data: any): number | null;
    private _getTables;
    private _getSchema;
    private _getIndexes;
    private _getForeignKeys;
    private _buildUpdateSetOfColumn;
    private _buildUpdateSet;
    private _buildPartialUpdateSet;
    private _buildSqlForFind;
    private _createDatabase;
    private _checkFeatures;
}
declare const _default: (connection: any) => MySQLAdapter;
export default _default;
