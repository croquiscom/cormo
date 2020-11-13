/// <reference types="node" />
import tls = require('tls');
export interface AdapterSettingsMySQL {
    host?: string;
    port?: number;
    user?: string | Promise<string>;
    password?: string | Promise<string>;
    database: string;
    charset?: string;
    collation?: string;
    pool_size?: number;
    query_timeout?: number;
    replication?: {
        use_master_for_read?: boolean;
        read_replicas: Array<{
            host?: string;
            port?: number;
            user?: string | Promise<string>;
            password?: string | Promise<string>;
            pool_size?: number;
        }>;
    };
    ssl?: string | (tls.SecureContextOptions & {
        rejectUnauthorized?: boolean;
    });
    authPlugins?: {
        [plugin: string]: ({ connection, command }: {
            connection: any;
            command: any;
        }) => (data: any) => Buffer;
    };
    reconnect_if_read_only?: boolean;
    hide_unknown_error?: boolean;
}
import { Connection } from '../connection';
import { Transaction } from '../transaction';
import { SQLAdapterBase } from './sql_base';
export declare class MySQLAdapter extends SQLAdapterBase {
    /**
     * Exposes mysql module's query method
     */
    query(text: string, values?: any[], options?: {
        transaction?: Transaction;
        node?: 'master' | 'read';
    }): Promise<any>;
    /**
     * Remove all unused connections from pool.
     */
    emptyFreeConnections(): void;
    getRunningQueries(): string[];
    getPoolStatus(): {
        used: number;
        queued: number;
    };
}
export declare function createAdapter(connection: Connection): MySQLAdapter;
