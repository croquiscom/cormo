export interface IAdapterSettingsRedis {
    host?: string;
    port?: number;
    database: string;
}
import { AdapterBase } from './base';
export declare class RedisAdapter extends AdapterBase {
}
declare const _default: (connection: any) => RedisAdapter;
export default _default;
