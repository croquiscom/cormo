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
    constructor(connection: Connection);
    setup(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
export { Transaction };
