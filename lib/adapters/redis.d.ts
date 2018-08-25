export interface IAdapterSettingsRedis {
    host?: string;
    port?: number;
    database: string;
}
import { AdapterBase } from './base';
declare class RedisAdapter extends AdapterBase {
    support_upsert: boolean;
    key_type: any;
    private _client;
    constructor(connection: any);
    drop(model: string): Promise<void>;
    valueToDB(value: any, column: any, property: any): any;
    create(model: string, data: any): Promise<any>;
    createBulk(model: string, data: any[]): Promise<any[]>;
    update(model: string, data: any): Promise<void>;
    updatePartial(model: string, data: any, conditions: any, options: any): Promise<number>;
    findById(model: any, id: any, options: any): Promise<any>;
    find(model: any, conditions: any, options: any): Promise<any>;
    delete(model: any, conditions: any): Promise<number>;
    /**
     * Connects to the database
     */
    connect(settings: IAdapterSettingsRedis): Promise<any>;
    protected valueToModel(value: any, property: any): any;
    private _getKeys;
}
declare const _default: (connection: any) => RedisAdapter;
export default _default;
