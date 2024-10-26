import { Connection } from '../connection/index.js';
import { SQLAdapterBase } from './sql_base.js';
export interface AdapterSettingsSQLite3 {
    database: string;
}
export declare class SQLite3Adapter extends SQLAdapterBase {
    /**
     * Exposes sqlite3 module's run method
     */
    run(sql: string, ...params: any[]): any;
    /**
     * Exposes sqlite3 module's all method
     */
    all(sql: string, ...params: any[]): any;
}
export declare function createAdapter(connection: Connection): SQLite3Adapter;
