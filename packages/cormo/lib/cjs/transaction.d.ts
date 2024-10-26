export declare enum IsolationLevel {
    READ_UNCOMMITTED = "READ UNCOMMITTED",
    READ_COMMITTED = "READ COMMITTED",
    REPEATABLE_READ = "REPEATABLE READ",
    SERIALIZABLE = "SERIALIZABLE"
}
declare class Transaction {
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
export { Transaction };
