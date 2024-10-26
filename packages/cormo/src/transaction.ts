import { Connection } from './connection/index.js';

export enum IsolationLevel {
  READ_UNCOMMITTED = 'READ UNCOMMITTED',
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE',
}

class Transaction {
  /** @internal */
  public _adapter_connection: any;
  /** @internal */
  private _connection: Connection;
  /** @internal */
  private _status: 'initial' | 'started' | 'committed' | 'rollbacked';

  /** @internal */
  constructor(connection: Connection) {
    this._connection = connection;
    this._status = 'initial';
  }

  /** @internal */
  public async setup(isolation_level?: IsolationLevel) {
    if (this._status !== 'initial') {
      throw new Error('can not start used transaction again');
    }
    this._adapter_connection = await this._connection._adapter.getConnection();
    await this._connection._adapter.startTransaction(this._adapter_connection, isolation_level);
    this._status = 'started';
  }

  public async commit() {
    if (this._status !== 'started') {
      throw new Error('not an active transaction');
    }
    await this._connection._adapter.commitTransaction(this._adapter_connection);
    await this._connection._adapter.releaseConnection(this._adapter_connection);
    this._status = 'committed';
  }

  public async rollback() {
    if (this._status !== 'started') {
      throw new Error('not an active transaction');
    }
    await this._connection._adapter.rollbackTransaction(this._adapter_connection);
    await this._connection._adapter.releaseConnection(this._adapter_connection);
    this._status = 'rollbacked';
  }

  /** @internal */
  public checkFinished() {
    if (this._status === 'committed' || this._status === 'rollbacked') {
      throw new Error('transaction finished');
    }
  }
}

export { Transaction };
