export interface IAdapterSettingsPostgreSQL {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database: string;
}
import { Connection } from '../connection';
import { Transaction } from '../transaction';
import { SQLAdapterBase } from './sql_base';
export declare class PostgreSQLAdapter extends SQLAdapterBase {
    /**
     * Exposes pg module's query method
     */
    query(text: string, values?: any[], transaction?: Transaction): Promise<any>;
}
export declare function createAdapter(connection: Connection): PostgreSQLAdapter;
