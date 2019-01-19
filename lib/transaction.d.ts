import { Connection } from './connection';
declare class Transaction {
    private _connection;
    constructor(connection: Connection);
}
export { Transaction };
