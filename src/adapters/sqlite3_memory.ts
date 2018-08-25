import SQLite3Adapter_createAdapter from './sqlite3';

export default (connection: any) => {
  const adapter: any = SQLite3Adapter_createAdapter(connection);
  const _super_connect = adapter.connect;
  adapter.connect = async function() {
    await _super_connect.call(this, {
      database: ':memory:',
    });
  };
  return adapter;
};
