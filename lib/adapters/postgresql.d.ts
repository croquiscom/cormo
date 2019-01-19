/// <reference types="node" />
export interface IAdapterSettingsPostgreSQL {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database: string;
}
import * as stream from 'stream';
import { Transaction } from '../transaction';
import { ISchemas } from './base';
import { SQLAdapterBase } from './sql_base';
declare class PostgreSQLAdapter extends SQLAdapterBase {
    key_type: any;
    support_geopoint: boolean;
    support_string_type_with_length: boolean;
    native_integrity: boolean;
    protected _contains_op: string;
    protected _regexp_op: string;
    private _pool;
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
    connect(settings: IAdapterSettingsPostgreSQL): Promise<void>;
    close(): void;
    /**
     * Exposes pg module's query method
     */
    query(): any;
    protected _param_place_holder(pos: any): string;
    protected valueToModel(value: any, property: any): any;
    protected _getModelID(data: any): number | null;
    protected _buildSelect(model_class: any, select: any): any;
    private _getTables;
    private _getSchema;
    private _getIndexes;
    private _getForeignKeys;
    private _buildUpdateSetOfColumn;
    private _buildUpdateSet;
    private _buildPartialUpdateSet;
    private _buildSqlForFind;
}
declare const _default: (connection: any) => PostgreSQLAdapter;
export default _default;
