export interface AdapterSettingsMongoDB {
    host?: string;
    port?: number;
    user?: string | Promise<string>;
    password?: string | Promise<string>;
    database: string;
}
import { Connection } from '../connection/index.js';
import { AdapterBase } from './base.js';
export declare class MongoDBAdapter extends AdapterBase {
    /**
     * Exposes mongodb module's a collection object
     */
    collection(model_name: string): any;
}
export declare function createAdapter(connection: Connection): MongoDBAdapter;
