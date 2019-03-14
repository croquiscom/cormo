export interface IAdapterSettingsMySQL {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database: string;
    charset?: string;
    collation?: string;
    pool_size?: number;
}
import { Connection } from '../connection';
import { Transaction } from '../transaction';
import { SQLAdapterBase } from './sql_base';
export declare class MySQLAdapter extends SQLAdapterBase {
    /**
     * Exposes mysql module's query method
     */
    query(text: string, values?: any[], transaction?: Transaction): Promise<any>;
    /**
     * Remove all unused connections from pool.
     */
    emptyFreeConnections(): void;
}
export declare function createAdapter(connection: Connection): MySQLAdapter;
