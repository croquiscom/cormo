export interface AdapterSettingsRedis {
    host?: string;
    port?: number;
    database: string;
}
import { Connection } from '../connection';
import { AdapterBase } from './base';
export declare class RedisAdapter extends AdapterBase {
}
export declare function createAdapter(connection: Connection): RedisAdapter;
