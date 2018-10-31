/// <reference types="node" />
export interface IAdapterSettingsSQLite3 {
    database: string;
}
import * as stream from 'stream';
import { ISchemas } from './base';
import { SQLAdapterBase } from './sql_base';
declare class SQLite3Adapter extends SQLAdapterBase {
    key_type: any;
    native_integrity: boolean;
    protected _regexp_op: null;
    protected _false_value: string;
    private _client;
    constructor(connection: any);
    getSchemas(): Promise<ISchemas>;
    createTable(model: string): Promise<void>;
    addColumn(model: string, column_property: any): Promise<void>;
    createIndex(model: string, index: any): Promise<void>;
    drop(model: string): Promise<void>;
    create(model: string, data: object): Promise<any>;
    createBulk(model: string, data: object[]): Promise<any[]>;
    update(model: string, data: any): Promise<void>;
    updatePartial(model: string, data: any, conditions: any, options: any): Promise<number>;
    findById(model: any, id: any, options: any): Promise<any>;
    find(model: any, conditions: any, options: any): Promise<any>;
    stream(model: any, conditions: any, options: any): stream.Readable;
    count(model: any, conditions: any, options: any): Promise<number>;
    delete(model: any, conditions: any): Promise<number>;
    /**
     * Connects to the database
     */
    connect(settings: IAdapterSettingsSQLite3): Promise<void>;
    close(): void;
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
