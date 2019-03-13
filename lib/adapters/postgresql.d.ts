export interface IAdapterSettingsPostgreSQL {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database: string;
}
import { Transaction } from '../transaction';
import { SQLAdapterBase } from './sql_base';
export declare class PostgreSQLAdapter extends SQLAdapterBase {
    /**
     * Exposes pg module's query method
     */
    query(text: string, values?: any[], transaction?: Transaction): Promise<any>;
}
declare const _default: (connection: any) => PostgreSQLAdapter;
export default _default;
