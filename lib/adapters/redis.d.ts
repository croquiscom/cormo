/// <reference types="node" />
export interface IAdapterSettingsRedis {
    host?: string;
    port?: number;
    database: string;
}
import * as stream from 'stream';
import { Transaction } from '../transaction';
import { AdapterBase, IAdapterCountOptions, IAdapterFindOptions } from './base';
declare class RedisAdapter extends AdapterBase {
    support_upsert: boolean;
    key_type: any;
    private _client;
    constructor(connection: any);
    drop(model: string): Promise<void>;
    valueToDB(value: any, column: any, property: any): any;
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
    close(): void;
    /**
     * Connects to the database
     */
    connect(settings: IAdapterSettingsRedis): Promise<any>;
    protected valueToModel(value: any, property: any): any;
    private _getKeys;
}
declare const _default: (connection: any) => RedisAdapter;
export default _default;
