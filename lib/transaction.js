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
