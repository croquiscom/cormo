import { Connection } from './connection';

class Transaction {
  public _adapter_connection: any;
  private _connection: Connection;

  constructor(connection: Connection) {
    this._connection = connection;
  }

  public async setup() {
    this._adapter_connection = await this._connection._adapter.getConnection();
    await this._connection._adapter.startTransaction(this._adapter_connection);
  }

  public async commit() {
    await this._connection._adapter.commitTransaction(this._adapter_connection);
    await this._connection._adapter.releaseConnection(this._adapter_connection);
  }

  public async rollback() {
    await this._connection._adapter.rollbackTransaction(this._adapter_connection);
    await this._connection._adapter.releaseConnection(this._adapter_connection);
  }
}

export { Transaction };
