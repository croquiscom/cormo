import { Connection } from './connection';
export declare enum IsolationLevel {
    READ_UNCOMMITTED = "READ UNCOMMITTED",
    READ_COMMITTED = "READ COMMITTED",
    REPEATABLE_READ = "REPEATABLE READ",
    SERIALIZABLE = "SERIALIZABLE"
}
declare class Transaction {
    _adapter_connection: any;
    private _connection;
    private _status;
    constructor(connection: Connection);
    setup(isolation_level?: IsolationLevel): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
export { Transaction };
