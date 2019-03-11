export interface IAdapterSettingsSQLite3 {
    database: string;
}
import { SQLAdapterBase } from './sql_base';
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
declare const _default: (connection: any) => SQLite3Adapter;
export default _default;
