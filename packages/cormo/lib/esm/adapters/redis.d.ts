import { Connection } from '../connection/index.js';
import { AdapterBase } from './base.js';
export interface AdapterSettingsRedis {
    host?: string;
    port?: number;
    database: string;
}
export declare class RedisAdapter extends AdapterBase {
}
export declare function createAdapter(connection: Connection): RedisAdapter;
