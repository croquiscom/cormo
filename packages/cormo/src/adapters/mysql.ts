let mysql: any;
let is_mysql2 = false;

import tls = require('tls');

try {
  mysql = require('mysql2');
  is_mysql2 = true;
} catch (error1) {
  try {
    mysql = require('mysql');
  } catch (error2) {
    //
  }
}

export interface AdapterSettingsMySQL {
  host?: string;
  port?: number;
  user?: string | Promise<string>;
  password?: string | Promise<string>;
  database: string;
  charset?: string;
  collation?: string;
  pool_size?: number;
  query_timeout?: number;
  replication?: {
    use_master_for_read?: boolean;
    read_replicas: Array<{ host?: string; port?: number; user?: string | Promise<string>; password?: string | Promise<string>; pool_size?: number }>;
  };
  ssl?: string | (tls.SecureContextOptions & { rejectUnauthorized?: boolean });
  authPlugins?: { [plugin: string]: ({ connection, command }: { connection: any; command: any }) => (data: any) => Buffer };
  reconnect_if_read_only?: boolean;
  hide_unknown_error?: boolean;
}

import stream from 'stream';
import util from 'util';
import _ from 'lodash';
import { Connection } from '../connection';
import { ColumnPropertyInternal, IndexProperty, ModelSchemaInternal } from '../model';
import { IsolationLevel, Transaction } from '../transaction';
import * as types from '../types';
import { AdapterCountOptions, AdapterFindOptions, Schemas, AdapterBase, SchemasTable, SchemasIndex } from './base';
import { SQLAdapterBase } from './sql_base';

function _typeToSQL(property: ColumnPropertyInternal, support_fractional_seconds: boolean) {
  if (property.array) {
    return 'TEXT';
  }
  switch (property.type_class) {
    case types.String:
      return `VARCHAR(${(property.type as types.CormoTypesString).length || 255})`;
    case types.Number:
      return 'DOUBLE';
    case types.Boolean:
      return 'TINYINT(1)';
    case types.Integer:
      return 'INT(11)';
    case types.GeoPoint:
      return 'POINT';
    case types.Date:
      if (support_fractional_seconds) {
        return 'DATETIME(3)';
      } else {
        return 'DATETIME';
      }
      break;
    case types.Object:
      return 'TEXT';
    case types.Text:
      return 'TEXT';
  }
}

function _propertyToSQL(property: ColumnPropertyInternal, support_fractional_seconds: boolean) {
  let type = _typeToSQL(property, support_fractional_seconds);
  if (type) {
    if (property.required) {
      type += ' NOT NULL';
    } else {
      type += ' NULL';
    }
    return type;
  }
}

async function _tryCreateConnection(config: any, count: number = 0): Promise<any> {
  count++;
  let client: any;
  try {
    client = mysql.createConnection({ ...config, connectTimeout: 2000 });
    client.connectAsync = util.promisify(client.connect);
    client.queryAsync = util.promisify(client.query);
    await client.connectAsync();
    return client;
  } catch (error) {
    client.end();
    if (error.errorno === 'ETIMEDOUT') {
      if (count < 5) {
        await new Promise((resolve) => {
          const time = Math.floor(Math.random() * Math.pow(2, count) * 200);
          setTimeout(() => resolve(), time);
        });
        return await _tryCreateConnection(config, count);
      }
      console.log('failed to create connection by ETIMEDOUT');
    }
    throw error;
  }
}

// Adapter for MySQL
// @namespace adapter
export class MySQLAdapter extends SQLAdapterBase {
  /** @internal */
  public key_type: any = types.Integer;

  /** @internal */
  public support_geopoint = true;

  /** @internal */
  public support_string_type_with_length = true;

  /** @internal */
  public native_integrity = true;

  /** @internal */
  public support_isolation_level_read_uncommitted = true;
  /** @internal */
  public support_isolation_level_repeatable_read = true;

  /** @internal */
  protected _escape_ch = '`';

  /** @internal */
  private _client: any;

  /** @internal */
  private _read_clients: any[] = [];

  /** @internal */
  private _read_client_index = -1;

  /** @internal */
  private _database?: string;

  /** @internal */
  private _settings?: AdapterSettingsMySQL;

  /** @internal */
  private _query_timeout: number;

  // Creates a MySQL adapter
  /** @internal */
  constructor(connection: Connection) {
    super();
    this._connection = connection;
    this._query_timeout = 60000;
  }

  /** @internal */
  public async getSchemas(): Promise<Schemas> {
    const tables = await this._getTables();
    const table_schemas: { [table_name: string]: SchemasTable } = {};
    for (const table of tables) {
      table_schemas[table.name] = await this._getSchema(table.name);
      table_schemas[table.name].description = table.comment;
    }
    const indexes = await this._getIndexes();
    const foreign_keys = await this._getForeignKeys();
    return {
      foreign_keys,
      indexes,
      tables: table_schemas,
    };
  }

  /** @internal */
  public getCreateTableQuery(model: string): string {
    const model_class = this._connection.models[model];
    const table_name = model_class.table_name;
    const column_sqls = [];
    for (const column in model_class._schema) {
      const property = model_class._schema[column];
      if (property.primary_key) {
        column_sqls.push(`\`${property._dbname_us}\` INT NOT NULL AUTO_INCREMENT UNIQUE PRIMARY KEY`);
      } else {
        let column_sql = _propertyToSQL(property, this.support_fractional_seconds);
        if (column_sql) {
          if (property.description) {
            column_sql += ` COMMENT '${property.description}'`;
          }
          column_sqls.push(`\`${property._dbname_us}\` ${column_sql}`);
        }
      }
    }
    let query = `CREATE TABLE \`${table_name}\` ( ${column_sqls.join(',')} )`;
    query += ` DEFAULT CHARSET=${this._settings!.charset || 'utf8'}`;
    query += ` COLLATE=${this._settings!.collation || 'utf8_unicode_ci'}`;
    if (model_class.description) {
      query += ` COMMENT='${model_class.description}'`;
    }
    return query;
  }

  /** @internal */
  public async createTable(model: string, verbose = false) {
    const query = this.getCreateTableQuery(model);
    if (verbose) {
      console.log(`  (${query})`);
    }
    try {
      await this._client.queryAsync(query);
    } catch (error) {
      throw this._wrapError('unknown error', error);
    }
  }

  /** @internal */
  public getUpdateTableDescriptionQuery(model: string): string {
    const model_class = this._connection.models[model];
    const table_name = model_class.table_name;
    return `ALTER TABLE ${table_name} COMMENT '${model_class.description ?? ''}'`;
  }

  /** @internal */
  public async updateTableDescription(model: string, verbose = false) {
    const query = this.getUpdateTableDescriptionQuery(model);
    if (verbose) {
      console.log(`  (${query})`);
    }
    try {
      await this._client.queryAsync(query);
    } catch (error) {
      throw this._wrapError('unknown error', error);
    }
  }

  /** @internal */
  public getAddColumnQuery(model: string, column_property: ColumnPropertyInternal): string {
    const model_class = this._connection.models[model];
    const table_name = model_class.table_name;
    let column_sql = _propertyToSQL(column_property, this.support_fractional_seconds);
    if (column_property.description) {
      column_sql += ` COMMENT '${column_property.description}'`;
    }
    return `ALTER TABLE \`${table_name}\` ADD COLUMN \`${column_property._dbname_us}\` ${column_sql}`;
  }

  /** @internal */
  public async addColumn(model: string, column_property: ColumnPropertyInternal, verbose = false) {
    const query = this.getAddColumnQuery(model, column_property);
    if (verbose) {
      console.log(`  (${query})`);
    }
    try {
      await this._client.queryAsync(query);
    } catch (error) {
      throw this._wrapError('unknown error', error);
    }
  }

  /** @internal */
  public getUpdateColumnDescriptionQuery(model: string, column_property: ColumnPropertyInternal): string {
    const model_class = this._connection.models[model];
    const table_name = model_class.table_name;
    let column_sql = _propertyToSQL(column_property, this.support_fractional_seconds);
    if (column_property.description) {
      column_sql += ` COMMENT '${column_property.description}'`;
    }
    return `ALTER TABLE \`${table_name}\` CHANGE COLUMN \`${column_property._dbname_us}\` \`${column_property._dbname_us}\` ${column_sql}`;
  }

  /** @internal */
  public async updateColumnDescription(model: string, column_property: ColumnPropertyInternal, verbose = false) {
    const query = this.getUpdateColumnDescriptionQuery(model, column_property);
    if (verbose) {
      console.log(`  (${query})`);
    }
    try {
      await this._client.queryAsync(query);
    } catch (error) {
      throw this._wrapError('unknown error', error);
    }
  }

  /** @internal */
  public getCreateIndexQuery(model_name: string, index: IndexProperty): string {
    const model_class = this._connection.models[model_name];
    const schema = model_class._schema;
    const table_name = model_class.table_name;
    const columns = [];
    for (const column in index.columns) {
      const order = index.columns[column];
      columns.push(`\`${schema[column] && schema[column]._dbname_us || column}\` ${(order === -1 ? 'DESC' : 'ASC')}`);
    }
    const unique = index.options.unique ? 'UNIQUE ' : '';
    return `CREATE ${unique}INDEX \`${index.options.name}\` ON \`${table_name}\` (${columns.join(',')})`;
  }

  /** @internal */
  public async createIndex(model_name: string, index: IndexProperty, verbose = false) {
    const query = this.getCreateIndexQuery(model_name, index);
    if (verbose) {
      console.log(`  (${query})`);
    }
    try {
      await this._client.queryAsync(query);
    } catch (error) {
      throw this._wrapError('unknown error', error);
    }
  }

  /** @internal */
  public getCreateForeignKeyQuery(model: string, column: string, type: string, references: any): string {
    const model_class = this._connection.models[model];
    const table_name = model_class.table_name;
    let action = '';
    switch (type) {
      case 'nullify':
        action = 'SET NULL';
        break;
      case 'restrict':
        action = 'RESTRICT';
        break;
      case 'delete':
        action = 'CASCADE';
        break;
    }
    return `ALTER TABLE \`${table_name}\` ADD FOREIGN KEY (\`${column}\`)
      REFERENCES \`${references.table_name}\`(id) ON DELETE ${action}`;
  }

  /** @internal */
  public async createForeignKey(model: string, column: string, type: string, references: any, verbose = false) {
    const query = this.getCreateForeignKeyQuery(model, column, type, references);
    if (verbose) {
      console.log(`  (${query})`);
    }
    try {
      await this._client.queryAsync(query);
    } catch (error) {
      throw this._wrapError('unknown error', error);
    }
  }

  /** @internal */
  public async deleteAllIgnoringConstraint(model_list: string[]): Promise<void> {
    const connection = await this.getConnection();
    try {
      await connection.queryAsync('SET FOREIGN_KEY_CHECKS = 0');
      await Promise.all(model_list.map(async (model) => {
        const table_name = this._connection.models[model].table_name;
        await connection.queryAsync(`TRUNCATE TABLE \`${table_name}\``);
      }));
      await connection.queryAsync('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      await this.releaseConnection(connection);
    }
  }

  /** @internal */
  public async drop(model: string) {
    const table_name = this._connection.models[model].table_name;
    try {
      await this._client.queryAsync(`DROP TABLE IF EXISTS \`${table_name}\``);
    } catch (error) {
      throw this._wrapError('unknown error', error);
    }
  }

  /** @internal */
  public getAdapterTypeString(column_property: ColumnPropertyInternal): string | undefined {
    return _typeToSQL(column_property, this.support_fractional_seconds);
  }

  /** @internal */
  public async create(model: string, data: any, options: { transaction?: Transaction }): Promise<any> {
    const table_name = this._connection.models[model].table_name;
    const values: any[] = [];
    const [fields, places] = this._buildUpdateSet(model, data, values, true);
    const sql = `INSERT INTO \`${table_name}\` (${fields}) VALUES (${places})`;
    let result;
    try {
      result = await this.query(sql, values, { transaction: options.transaction });
    } catch (error) {
      throw this._processSaveError(error);
    }
    const id = result && result.insertId;
    if (id) {
      return id;
    } else {
      throw new Error('unexpected result');
    }
  }

  /** @internal */
  public async createBulk(model: string, data: any[], options: { transaction?: Transaction }): Promise<any[]> {
    const table_name = this._connection.models[model].table_name;
    const values: any[] = [];
    let fields: any;
    const places: any[] = [];
    data.forEach((item) => {
      let places_sub;
      [fields, places_sub] = this._buildUpdateSet(model, item, values, true);
      places.push('(' + places_sub + ')');
    });
    const sql = `INSERT INTO \`${table_name}\` (${fields}) VALUES ${places.join(',')}`;
    let result;
    try {
      result = await this.query(sql, values, { transaction: options.transaction });
    } catch (error) {
      throw this._processSaveError(error);
    }
    const id = result && result.insertId;
    if (id) {
      return data.map((item, i) => id + i);
    } else {
      throw new Error('unexpected result');
    }
  }

  /** @internal */
  public async update(model: string, data: any, options: { transaction?: Transaction }) {
    const table_name = this._connection.models[model].table_name;
    const values: any[] = [];
    const [fields] = this._buildUpdateSet(model, data, values);
    values.push(data.id);
    const sql = `UPDATE \`${table_name}\` SET ${fields} WHERE id=?`;
    try {
      await this.query(sql, values, { transaction: options.transaction });
    } catch (error) {
      throw this._processSaveError(error);
    }
  }

  /** @internal */
  public async updatePartial(
    model: string, data: any, conditions: any,
    options: { transaction?: Transaction },
  ): Promise<number> {
    const table_name = this._connection.models[model].table_name;
    const values: any[] = [];
    const [fields] = this._buildPartialUpdateSet(model, data, values);
    let sql = `UPDATE \`${table_name}\` SET ${fields}`;
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, values);
    }
    let result;
    try {
      result = await this.query(sql, values, { transaction: options.transaction });
    } catch (error) {
      throw this._processSaveError(error);
    }
    if (result == null) {
      throw this._wrapError('unknown error');
    }
    return result.affectedRows;
  }

  /** @internal */
  public async upsert(model: string, data: any, conditions: any, options: any) {
    const table_name = this._connection.models[model].table_name;
    const insert_data: any = {};
    for (const key in data) {
      const value = data[key];
      if (value && value.$inc != null) {
        insert_data[key] = value.$inc;
      } else {
        insert_data[key] = value;
      }
    }
    for (const condition of conditions) {
      for (const key in condition) {
        const value = condition[key];
        insert_data[key] = value;
      }
    }
    const values: any = [];
    let fields;
    let places = '';
    [fields, places] = this._buildUpdateSet(model, insert_data, values, true);
    let sql = `INSERT INTO \`${table_name}\` (${fields}) VALUES (${places})`;
    [fields] = this._buildPartialUpdateSet(model, data, values);
    sql += ` ON DUPLICATE KEY UPDATE ${fields}`;
    try {
      await this.query(sql, values, options.transaction);
    } catch (error) {
      throw this._processSaveError(error);
    }
  }

  /** @internal */
  public async findById(
    model: string, id: any,
    options: { select?: string[]; explain?: boolean; transaction?: Transaction; node?: 'master' | 'read' },
  ): Promise<any> {
    id = this._convertValueType(id, this.key_type);
    const select = this._buildSelect(this._connection.models[model], options.select);
    const table_name = this._connection.models[model].table_name;
    const sql = `SELECT ${select} FROM \`${table_name}\` WHERE id=? LIMIT 1`;
    if (options.explain) {
      return await this.query(`EXPLAIN ${sql}`, id, { transaction: options.transaction, node: options.node });
    }
    let result;
    try {
      result = await this.query(sql, id, { transaction: options.transaction, node: options.node });
    } catch (error) {
      throw this._wrapError('unknown error', error);
    }
    if (result && result.length === 1) {
      return this._convertToModelInstance(model, result[0], options);
    } else if (result && result.length > 1) {
      throw new Error('unknown error');
    } else {
      throw new Error('not found');
    }
  }

  /** @internal */
  public async find(model: string, conditions: any, options: AdapterFindOptions): Promise<any> {
    const [sql, params] = this._buildSqlForFind(model, conditions, options);
    if (options.explain) {
      return await this.query(`EXPLAIN ${sql}`, params, { transaction: options.transaction, node: options.node });
    }
    let result;
    try {
      result = await this.query(sql, params, { transaction: options.transaction, node: options.node });
    } catch (error) {
      throw this._wrapError('unknown error', error);
    }
    if (options.group_fields) {
      return result.map((record: any) => {
        return this._convertToGroupInstance(model, record, options.group_by, options.group_fields);
      });
    } else {
      return result.map((record: any) => {
        return this._convertToModelInstance(model, record, options);
      });
    }
  }

  /** @internal */
  public stream(model: any, conditions: any, options: AdapterFindOptions): stream.Readable {
    let sql;
    let params;
    try {
      [sql, params] = this._buildSqlForFind(model, conditions, options);
    } catch (error) {
      const readable = new stream.Readable({ objectMode: true });
      readable._read = () => readable.emit('error', error);
      return readable;
    }
    const transformer = new stream.Transform({ objectMode: true });
    transformer._transform = (record, encoding, callback) => {
      transformer.push(this._convertToModelInstance(model, record, options));
      callback();
    };
    this._connection._logger.logQuery(sql, params);
    this._client.query(sql, params).stream().on('error', (error: any) => {
      return transformer.emit('error', error);
    }).pipe(transformer);
    return transformer;
  }

  /** @internal */
  public async count(model: string, conditions: any, options: AdapterCountOptions): Promise<number> {
    const params: any = [];
    const table_name = this._connection.models[model].table_name;
    let sql = `SELECT COUNT(*) AS count FROM \`${table_name}\``;
    if (options.index_hint) {
      sql += ` ${options.index_hint}`;
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, params);
    }
    if (options.group_by) {
      const escape_ch = this._escape_ch;
      sql += ' GROUP BY ' + options.group_by.map((column) => `${escape_ch}${column}${escape_ch}`).join(',');
      if (options.conditions_of_group.length > 0) {
        sql += ' HAVING ' + this._buildWhere(options.group_fields, options.conditions_of_group, params);
      }
      sql = `SELECT COUNT(*) AS count FROM (${sql}) _sub`;
    }
    let result;
    try {
      result = await this.query(sql, params, { transaction: options.transaction, node: options.node });
    } catch (error) {
      throw this._wrapError('unknown error', error);
    }
    if (result && result.length !== 1) {
      throw new Error('unknown error');
    }
    return Number(result[0].count);
  }

  /** @internal */
  public async delete(model: string, conditions: any, options: { transaction?: Transaction }): Promise<number> {
    const params: any = [];
    const table_name = this._connection.models[model].table_name;
    let sql = `DELETE FROM \`${table_name}\``;
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, params);
    }
    let result;
    try {
      result = await this.query(sql, params, { transaction: options.transaction });
    } catch (error) {
      if (error && (error.code === 'ER_ROW_IS_REFERENCED_' || error.code === 'ER_ROW_IS_REFERENCED_2')) {
        throw new Error('rejected');
      }
      throw this._wrapError('unknown error', error);
    }
    if (result == null) {
      throw this._wrapError('unknown error');
    }
    return result.affectedRows;
  }

  /**
   * Connects to the database
   * @internal
   */
  public async connect(settings: AdapterSettingsMySQL) {
    // connect
    let client: any;
    this._database = settings.database;
    this._settings = settings;
    if (settings.query_timeout) {
      this._query_timeout = settings.query_timeout;
    }
    try {
      client = await _tryCreateConnection({
        charset: settings.charset,
        host: settings.host,
        password: await settings.password,
        port: settings.port,
        user: await settings.user,
        ssl: settings.ssl,
        authPlugins: settings.authPlugins,
      });
    } catch (error) {
      if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        throw error;
      }
      throw this._wrapError('failed to connect', error);
    }
    try {
      await this._createDatabase(client);
    } catch (error) {
      client.end();
      throw error;
    }
    try {
      await this._checkFeatures(client);
    } finally {
      client.end();
    }
    this._client = mysql.createPool({
      charset: settings.charset,
      connectionLimit: settings.pool_size || 10,
      database: settings.database,
      host: settings.host,
      password: await settings.password,
      port: settings.port,
      user: await settings.user,
      ssl: settings.ssl,
      authPlugins: settings.authPlugins,
    });
    this._client._node_id = 'MASTER';
    this._client.queryAsync = util.promisify(this._client.query);
    this._client.getConnectionAsync = util.promisify(this._client.getConnection);

    if (settings.replication) {
      this._read_clients = [];
      if (settings.replication.use_master_for_read) {
        this._read_clients.push(this._client);
      }
      for (let i = 0; i < settings.replication.read_replicas.length; i++) {
        const replica = settings.replication.read_replicas[i];
        const read_client = mysql.createPool({
          charset: settings.charset,
          connectionLimit: replica.pool_size || 10,
          database: settings.database,
          host: replica.host,
          password: await replica.password,
          port: replica.port,
          user: await replica.user,
          ssl: settings.ssl,
          authPlugins: settings.authPlugins,
        });
        read_client._node_id = `SLAVE${i + 1}`;
        read_client.queryAsync = util.promisify(read_client.query);
        read_client.getConnectionAsync = util.promisify(read_client.getConnection);
        this._read_clients.push(read_client);
      }
    }
  }

  /** @internal */
  public close() {
    if (this._client) {
      this._client.end();
    }
    this._client = null;
  }

  /** @internal */
  public async getConnection(): Promise<any> {
    const adapter_connection = await this._client.getConnectionAsync();
    adapter_connection.queryAsync = util.promisify(adapter_connection.query);
    adapter_connection.beginTransactionAsync = util.promisify(adapter_connection.beginTransaction);
    adapter_connection.commitAsync = util.promisify(adapter_connection.commit);
    adapter_connection.rollbackAsync = util.promisify(adapter_connection.rollback);
    return adapter_connection;
  }

  /** @internal */
  public async releaseConnection(adapter_connection: any): Promise<void> {
    adapter_connection.release();
    return Promise.resolve();
  }

  /** @internal */
  public async startTransaction(adapter_connection: any, isolation_level?: IsolationLevel): Promise<void> {
    if (isolation_level) {
      await adapter_connection.queryAsync(`SET TRANSACTION ISOLATION LEVEL ${isolation_level}`);
    }
    await adapter_connection.beginTransactionAsync();
  }

  /** @internal */
  public async commitTransaction(adapter_connection: any): Promise<void> {
    await adapter_connection.commitAsync();
  }

  /** @internal */
  public async rollbackTransaction(adapter_connection: any): Promise<void> {
    await adapter_connection.rollbackAsync();
  }

  /**
   * Exposes mysql module's query method
   */
  public async query(text: string, values?: any[], options?: { transaction?: Transaction; node?: 'master' | 'read' }) {
    if (!this._client) {
      await this._connection._promise_connection;
    }
    const transaction = options && options.transaction;
    if (transaction && transaction._adapter_connection) {
      this._connection._logger.logQuery(text, values);
      transaction.checkFinished();
      return await transaction._adapter_connection.queryAsync({ sql: text, values, timeout: this._query_timeout });
    } else {
      let client = this._client;
      if (options && options.node === 'read' && this._read_clients.length > 0
        && text.substring(0, 6).toUpperCase() === 'SELECT') {
        this._read_client_index++;
        if (this._read_client_index >= this._read_clients.length || this._read_client_index < 0) {
          this._read_client_index = 0;
        }
        client = this._read_clients[this._read_client_index];
      }
      this._connection._logger.logQuery(`[${client._node_id}] ${text}`, values);
      try {
        return await client.queryAsync({ sql: text, values, timeout: this._query_timeout });
      } catch (error) {
        if (this._settings?.reconnect_if_read_only && error.message.includes('read-only')) {
          // if failover occurred, connections will be reconnected.
          // But if connection is reconnected before DNS is changed (DNS cache can affect this),
          // connection may be to the wrong node.
          // In that case, free all connections and try to reconnect.
          console.log('connected to the read-only node. try to reconnect');
          this.emptyFreeConnections();
        }
        throw error;
      }
    }
  }

  /**
   * Remove all unused connections from pool.
   */
  public emptyFreeConnections() {
    if (!this._client) {
      return;
    }
    if (is_mysql2) {
      const list = this._client._freeConnections.toArray();
      for (const connection of list) {
        connection.destroy();
      }
    } else {
      while (this._client._freeConnections.length > 0) {
        this._client._purgeConnection(this._client._freeConnections[0]);
      }
    }
  }

  public getRunningQueries(): string[] {
    const queries = [] as string[];
    for (const conn of this._client._allConnections) {
      if (conn && conn._protocol && conn._protocol._queue && conn._protocol._queue.length > 0) {
        const query = conn._protocol._queue[0];
        queries.push(query.sql);
      }
    }
    return queries;
  }

  public getPoolStatus(): { used: number; queued: number } {
    const used = this._client._allConnections.length - this._client._freeConnections.length;
    const queued = this._client._connectionQueue.length;
    return { used, queued };
  }

  /** @internal */
  protected valueToModel(value: any, property: any) {
    if (property.type_class === types.Object || property.array) {
      try {
        return JSON.parse(value);
      } catch (error) {
        return null;
      }
    } else if (property.type_class === types.GeoPoint) {
      return [value.x, value.y];
    } else if (property.type_class === types.Boolean) {
      return value !== 0;
    } else {
      return value;
    }
  }

  /** @internal */
  protected _getModelID(data: any) {
    if (!data.id) {
      return null;
    }
    return Number(data.id);
  }

  /** @internal */
  protected _buildGroupExpr(schema: ModelSchemaInternal, group_expr: any) {
    const op = Object.keys(group_expr)[0];
    if (op === '$any') {
      const sub_expr = group_expr[op];
      if (sub_expr.substr(0, 1) === '$') {
        let column = sub_expr.substr(1);
        column = schema[column] && schema[column]._dbname_us || column;
        return `ANY_VALUE(${column})`;
      } else {
        throw new Error(`unknown expression '${JSON.stringify(op)}'`);
      }
    } else {
      return super._buildGroupExpr(schema, group_expr);
    }
  }

  /** @internal */
  private async _getTables(): Promise<Array<{ name: string, comment: string }>> {
    const result = await this._client.queryAsync('SHOW TABLE STATUS');
    return result.map((item: any) => ({
      name: item.Name,
      comment: item.Comment,
    }));
  }

  /** @internal */
  private async _getSchema(table: string): Promise<SchemasTable> {
    const columns = await this._client.queryAsync(`SHOW FULL COLUMNS FROM \`${table}\``);
    const schema: SchemasTable = { columns: {} };
    for (const column of columns) {
      const type = /^varchar\((\d*)\)/i.test(column.Type) ? new types.String(Number(RegExp.$1))
        : /^double/i.test(column.Type) ? new types.Number()
          : /^tinyint\(1\)/i.test(column.Type) ? new types.Boolean()
            : /^int/i.test(column.Type) ? new types.Integer()
              : /^point/i.test(column.Type) ? new types.GeoPoint()
                : /^datetime/i.test(column.Type) ? new types.Date()
                  : /^text/i.test(column.Type) ? new types.Text() : undefined;
      schema.columns[column.Field] = {
        required: column.Null === 'NO',
        type,
        adapter_type_string: column.Type.toUpperCase(),
        description: column.Comment,
      };
    }
    return schema;
  }

  /** @internal */
  private async _getIndexes(): Promise<{ [table_name: string]: SchemasIndex }> {
    const sql = 'SELECT * FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? ORDER BY SEQ_IN_INDEX';
    const rows = await this._client.queryAsync(sql, [this._database]);
    const indexes: { [table_name: string]: SchemasIndex } = {};
    for (const row of rows) {
      if (row.INDEX_NAME === 'id' || row.INDEX_NAME === 'PRIMARY') {
        continue;
      }
      const indexes_of_table = indexes[row.TABLE_NAME] || (indexes[row.TABLE_NAME] = {});
      (indexes_of_table[row.INDEX_NAME] || (indexes_of_table[row.INDEX_NAME] = {}))[row.COLUMN_NAME] = 1;
    }
    return indexes;
  }

  /** @internal */
  private async _getForeignKeys(): Promise<any> {
    const sql = `SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE
      REFERENCED_TABLE_NAME IS NOT NULL AND CONSTRAINT_SCHEMA = ?`;
    const rows = await this._client.queryAsync(sql, [this._database]);
    const foreign_keys: any = {};
    for (const row of rows) {
      const foreign_keys_of_table = foreign_keys[row.TABLE_NAME] || (foreign_keys[row.TABLE_NAME] = {});
      foreign_keys_of_table[row.COLUMN_NAME] = row.REFERENCED_TABLE_NAME;
    }
    return foreign_keys;
  }

  /** @internal */
  private _buildUpdateSetOfColumn(
    property: any, data: any, values: any, fields: any[], places: any[], insert: boolean = false,
  ) {
    const dbname = property._dbname_us;
    const value = data[dbname];
    if (property.type_class === types.GeoPoint) {
      values.push(value[0]);
      values.push(value[1]);
      if (insert) {
        fields.push(`\`${dbname}\``);
        places.push('POINT(?,?)');
      } else {
        fields.push(`\`${dbname}\`=POINT(?,?)`);
      }
    } else if (value && value.$inc != null) {
      values.push(value.$inc);
      fields.push(`\`${dbname}\`=\`${dbname}\`+?`);
    } else {
      values.push(value);
      if (insert) {
        fields.push(`\`${dbname}\``);
        places.push('?');
      } else {
        fields.push(`\`${dbname}\`=?`);
      }
    }
  }

  /** @internal */
  private _buildUpdateSet(model: string, data: any, values: any, insert: boolean = false) {
    const schema = this._connection.models[model]._schema;
    const fields: any[] = [];
    const places: any[] = [];
    for (const column in schema) {
      const property = schema[column];
      if (property.primary_key) {
        continue;
      }
      this._buildUpdateSetOfColumn(property, data, values, fields, places, insert);
    }
    return [fields.join(','), places.join(',')];
  }

  /** @internal */
  private _buildPartialUpdateSet(model: string, data: any, values: any[]) {
    const schema = this._connection.models[model]._schema;
    const fields: any[] = [];
    const places: any[] = [];
    for (const column in data) {
      const value = data[column];
      const property = _.find(schema, (item) => item._dbname_us === column);
      if (!property || property.primary_key) {
        continue;
      }
      this._buildUpdateSetOfColumn(property, data, values, fields, places);
    }
    return [fields.join(','), places.join(',')];
  }

  /** @internal */
  private _buildSqlForFind(model_name: string, conditions: any, options: AdapterFindOptions): [string, any[]] {
    const model_class = this._connection.models[model_name];
    let select;
    if (options.group_by || options.group_fields) {
      select = this._buildGroupFields(model_class, options.group_by, options.group_fields);
    } else {
      select = this._buildSelect(model_class, options.select);
    }
    let order_by;
    if (options.near != null && Object.keys(options.near)[0]) {
      const field = Object.keys(options.near)[0];
      order_by = `\`${field}_distance\``;
      const location = options.near[field];
      select += `,GLENGTH(LINESTRING(\`${field}\`,POINT(${location[0]},${location[1]}))) AS \`${field}_distance\``;
    }
    const params: any[] = [];
    const table_name = model_class.table_name;
    let sql = `SELECT ${select} FROM \`${table_name}\``;
    if (options.index_hint) {
      sql += ` ${options.index_hint}`;
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(model_class._schema, conditions, params);
    }
    if (options.group_by) {
      const escape_ch = this._escape_ch;
      sql += ' GROUP BY ' + options.group_by.map((column) => `${escape_ch}${column}${escape_ch}`).join(',');
    }
    if (options.conditions_of_group.length > 0) {
      sql += ' HAVING ' + this._buildWhere(options.group_fields, options.conditions_of_group, params);
    }
    if ((options && options.orders.length > 0) || order_by) {
      const schema = model_class._schema;
      const orders = options.orders.map((order: any) => {
        let column;
        if (order[0] === '-') {
          column = order.slice(1);
          order = 'DESC';
        } else {
          column = order;
          order = 'ASC';
        }
        column = schema[column] && schema[column]._dbname_us || column;
        return `\`${column}\` ${order}`;
      });
      if (order_by) {
        orders.push(order_by);
      }
      sql += ' ORDER BY ' + orders.join(',');
    }
    if (options && options.limit) {
      sql += ' LIMIT ' + options.limit;
      if (options && options.skip) {
        sql += ' OFFSET ' + options.skip;
      }
    } else if (options && options.skip) {
      sql += ' LIMIT 2147483647 OFFSET ' + options.skip;
    }
    return [sql, params];
  }

  // create database if not exist
  /** @internal */
  private async _createDatabase(client: any): Promise<any> {
    try {
      // check database existence
      return await client.queryAsync(`USE \`${this._database}\``);
    } catch (error1) {
      if (error1.code === 'ER_BAD_DB_ERROR') {
        try {
          await client.queryAsync(`CREATE DATABASE \`${this._database}\``);
        } catch (error2) {
          throw this._wrapError('unknown error', error2);
        }
        return (await this._createDatabase(client));
      } else {
        const msg = error1.code === 'ER_DBACCESS_DENIED_ERROR'
          ? `no access right to the database '${this._database}'`
          : 'unknown error';
        throw this._wrapError(msg, error1);
      }
    }
  }

  /** @internal */
  private async _checkFeatures(client: any) {
    try {
      await client.queryAsync('CREATE TABLE _temp (date DATETIME(10))');
    } catch (error) {
      if (error.code === 'ER_PARSE_ERROR') {
        // MySQL 5.6.4 below does not support fractional seconds
        this.support_fractional_seconds = false;
      } else if (error.code === 'ER_TOO_BIG_PRECISION') {
        this.support_fractional_seconds = true;
      } else {
        throw error;
      }
    }
  }

  /** @internal */
  private _processSaveError(error: any) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return new Error('table does not exist');
    } else if (error.code === 'ER_DUP_ENTRY') {
      const key = error.message.match(/for key '([^']*)'/);
      return new Error('duplicated ' + (key && key[1]));
    } else if (error.code === 'ER_BAD_NULL_ERROR') {
      const key = error.message.match(/Column '([^']*)'/);
      return new Error(`'${key && key[1]}' is required`);
    } else {
      return this._wrapError('unknown error', error);
    }
  }

  /** @internal */
  private _wrapError(msg: string, cause?: Error): Error {
    if (!this._settings?.hide_unknown_error && msg === 'unknown error' && cause) {
      return cause;
    }
    return MySQLAdapter.wrapError(msg, cause);
  }
}

export function createAdapter(connection: Connection) {
  if (!mysql) {
    console.log('Install mysql module to use this adapter');
    process.exit(1);
  }
  return new MySQLAdapter(connection);
}
