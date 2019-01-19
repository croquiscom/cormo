import { Connection } from './connection';
declare class Transaction {
    _adapter_connection: any;
    private _connection;
    constructor(connection: Connection);
    setup(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
export { Transaction };
