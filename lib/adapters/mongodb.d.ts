export interface IAdapterSettingsMongoDB {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database: string;
}
import { Connection } from '../connection';
import { AdapterBase } from './base';
export declare class MongoDBAdapter extends AdapterBase {
    /**
     * Exposes mongodb module's a collection object
     */
    collection(model: any): any;
}
export declare function createAdapter(connection: Connection): MongoDBAdapter;
