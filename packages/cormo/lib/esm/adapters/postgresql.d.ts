export interface AdapterSettingsPostgreSQL {
    host?: string;
    port?: number;
    user?: string | Promise<string>;
    password?: string | Promise<string>;
    database: string;
}
import { Connection } from '../connection/index.js';
import { Transaction } from '../transaction.js';
import { SQLAdapterBase } from './sql_base.js';
export declare class PostgreSQLAdapter extends SQLAdapterBase {
    /**
     * Exposes pg module's query method
     */
    query(text: string, values?: any[], transaction?: Transaction): Promise<any>;
}
export declare function createAdapter(connection: Connection): PostgreSQLAdapter;
