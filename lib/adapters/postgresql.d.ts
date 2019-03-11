export interface IAdapterSettingsPostgreSQL {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database: string;
}
import { SQLAdapterBase } from './sql_base';
export declare class PostgreSQLAdapter extends SQLAdapterBase {
    /**
     * Exposes pg module's query method
     */
    query(text: string, values?: any[], adapter_connection?: any): Promise<any>;
}
declare const _default: (connection: any) => PostgreSQLAdapter;
export default _default;
