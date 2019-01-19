import { Connection } from './connection';

class Transaction {
  private _connection: Connection;

  constructor(connection: Connection) {
    this._connection = connection;
  }
}

export { Transaction };
