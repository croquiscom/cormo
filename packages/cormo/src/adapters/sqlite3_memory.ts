import { Connection } from '../connection';
import { createAdapter as createSQLite3Adapter } from './sqlite3';

export function createAdapter(connection: Connection) {
  const adapter: any = createSQLite3Adapter(connection);
  const _super_connect = adapter.connect;
  adapter.connect = async function() {
    await _super_connect.call(this, {
      database: ':memory:',
    });
  };
  return adapter;
}
