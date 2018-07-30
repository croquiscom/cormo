import SQLite3Adapter_createAdapter from './sqlite3';

export default (connection) => {
  const adapter = SQLite3Adapter_createAdapter(connection);
  const _super_connect = adapter.connect;
  adapter.connect = async function(settings) {
    return await _super_connect.call(this, {
      database: ':memory:',
    });
  };
  return adapter;
};
