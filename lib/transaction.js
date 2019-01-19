"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Transaction {
    constructor(connection) {
        this._connection = connection;
    }
    async setup() {
        this._adapter_connection = await this._connection._adapter.getConnection();
        await this._connection._adapter.startTransaction(this._adapter_connection);
    }
    async commit() {
        await this._connection._adapter.commitTransaction(this._adapter_connection);
        await this._connection._adapter.releaseConnection(this._adapter_connection);
    }
    async rollback() {
        await this._connection._adapter.rollbackTransaction(this._adapter_connection);
        await this._connection._adapter.releaseConnection(this._adapter_connection);
    }
}
exports.Transaction = Transaction;
