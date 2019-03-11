export interface IAdapterSettingsMongoDB {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database: string;
}
import { AdapterBase } from './base';
export declare class MongoDBAdapter extends AdapterBase {
    /**
     * Exposes mongodb module's a collection object
     */
    collection(model: any): any;
}
declare const _default: (connection: any) => MongoDBAdapter;
export default _default;
