"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var IsolationLevel;
(function (IsolationLevel) {
    IsolationLevel["READ_UNCOMMITTED"] = "READ UNCOMMITTED";
    IsolationLevel["READ_COMMITTED"] = "READ COMMITTED";
    IsolationLevel["REPEATABLE_READ"] = "REPEATABLE READ";
    IsolationLevel["SERIALIZABLE"] = "SERIALIZABLE";
})(IsolationLevel = exports.IsolationLevel || (exports.IsolationLevel = {}));
class Transaction {
    constructor(connection) {
        this._connection = connection;
        this._status = 'initial';
    }
    async setup(isolation_level) {
        if (this._status !== 'initial') {
            throw new Error('can not start used transaction again');
        }
        this._adapter_connection = await this._connection._adapter.getConnection();
        await this._connection._adapter.startTransaction(this._adapter_connection, isolation_level);
        this._status = 'started';
    }
    async commit() {
        if (this._status !== 'started') {
            throw new Error('not an active transaction');
        }
        await this._connection._adapter.commitTransaction(this._adapter_connection);
        await this._connection._adapter.releaseConnection(this._adapter_connection);
        this._status = 'committed';
    }
    async rollback() {
        if (this._status !== 'started') {
            throw new Error('not an active transaction');
        }
        await this._connection._adapter.rollbackTransaction(this._adapter_connection);
        await this._connection._adapter.releaseConnection(this._adapter_connection);
        this._status = 'rollbacked';
    }
}
exports.Transaction = Transaction;
