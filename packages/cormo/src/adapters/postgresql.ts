import stream from 'stream';
import _ from 'lodash';
import { Connection } from '../connection/index.js';
import { ColumnPropertyInternal, IndexProperty, ModelSchemaInternal } from '../model/index.js';
import { IsolationLevel, Transaction } from '../transaction.js';
import * as types from '../types.js';
import {
  AdapterCountOptions,
  AdapterFindOptions,
  Schemas,
  AdapterBase,
  SchemasTable,
  SchemasIndex,
  AdapterDeleteOptions,
} from './base.js';
import { SQLAdapterBase } from './sql_base.js';

let pg: any;
let QueryStream: any;

// @ts-expect-error no type definitions
const module_promise = import('pg')
  .then((m) => {
    pg = m.default;
    return import('pg-query-stream')
      .then((m2) => {
        QueryStream = m2.default;
      })
      .catch(() => {
        //
      });
  })
  .catch(() => {
    //
  });

export interface AdapterSettingsPostgreSQL {
  host?: string;
  port?: number;
  user?: string | Promise<string>;
  password?: string | Promise<string>;
  database: string;
}

function _typeToSQL(property: ColumnPropertyInternal) {
  if (property.array) {
    return 'JSON';
  }
  switch (property.type_class) {
    case types.String:
      return `CHARACTER VARYING(${(property.type as types.CormoTypesString).length || 255})`;
    case types.Number:
      return 'DOUBLE PRECISION';
    case types.Boolean:
      return 'BOOLEAN';
    case types.Integer:
      return 'INTEGER';
    case types.BigInteger:
      return 'BIGINT';
    case types.GeoPoint:
      return 'GEOMETRY(POINT)';
    case types.Vector:
      return (property.type as types.CormoTypesVector).dimension
        ? `VECTOR(${(property.type as types.CormoTypesVector).dimension})`
        : 'VECTOR';
    case types.Date:
      return 'TIMESTAMP WITHOUT TIME ZONE';
    case types.Object:
      return 'JSON';
    case types.Text:
      return 'TEXT';
    case types.Blob:
      return 'BYTEA';
  }
}

function _propertyToSQL(property: ColumnPropertyInternal) {
  let type = _typeToSQL(property);
  if (type) {
    if (property.required) {
      type += ' NOT NULL';
    } else {
      type += ' NULL';
    }
    return type;
  }
}

function _processSaveError(table_name: any, error: any) {
  if (error.code === '42P01') {
    return new Error('table does not exist');
  } else if (error.code === '23505') {
    let column = '';
    let key = error.message.match(/unique constraint "(.*)"/);
    if (key != null) {
      column = key[1];
      key = new RegExp(`${table_name}_([^']*)_key`).exec(column);
      if (key != null) {
        column = key[1];
      }
      column = ' ' + column;
    }
    return new Error('duplicated' + column);
  } else {
    return AdapterBase.wrapError('unknown error', error);
  }
}

// Adapter for PostgreSQL
// @namespace adapter
export class PostgreSQLAdapter extends SQLAdapterBase {
  /** @internal */
  public key_type: any = types.Integer;

  /** @internal */
  public support_geopoint = true;

  /** @internal */
  public support_string_type_with_length = true;

  /** @internal */
  public support_join = true;

  /** @internal */
  public support_distinct = true;

  /** @internal */
  public native_integrity = true;

  /** @internal */
  public support_isolation_level_read_uncommitted = false;
  /** @internal */
  public support_isolation_level_repeatable_read = false;

  /** @internal */
  protected _contains_op = 'ILIKE';

  /** @internal */
  protected _regexp_op = '~*';

  /** @internal */
  private _pool: any;

  // Creates a PostgreSQL adapter
  /** @internal */
  constructor(connection: Connection) {
    super();
    this._connection = connection;
  }

  /** @internal */
  public async getSchemas(): Promise<Schemas> {
    const tables = await this._getTables();
    const table_schemas: { [table_name: string]: SchemasTable } = {};
    for (const table of tables) {
      table_schemas[table] = await this._getSchema(table);
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
  public async createTable(model_name: string) {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return;
    }
    const table_name = model_class.table_name;
    const column_sqls = [];
    for (const column in model_class._schema) {
      const property = model_class._schema[column];
      if (!property) {
        continue;
      }
      if (property.primary_key) {
        column_sqls.push(`"${property._dbname_us}" SERIAL PRIMARY KEY`);
      } else {
        const column_sql = _propertyToSQL(property);
        if (column_sql) {
          column_sqls.push(`"${property._dbname_us}" ${column_sql}`);
        }
      }
    }
    const sql = `CREATE TABLE "${table_name}" ( ${column_sqls.join(',')} )`;
    try {
      await this._pool.query(sql);
    } catch (error: any) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
  }

  /** @internal */
  public async addColumn(model_name: string, column_property: ColumnPropertyInternal) {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return;
    }
    const table_name = model_class.table_name;
    const column_name = column_property._dbname_us;
    const sql = `ALTER TABLE "${table_name}" ADD COLUMN "${column_name}" ${_propertyToSQL(column_property)}`;
    try {
      await this._pool.query(sql);
    } catch (error: any) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
  }

  /** @internal */
  public async createIndex(model_name: string, index: IndexProperty) {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return;
    }
    const schema = model_class._schema;
    const table_name = model_class.table_name;
    const columns = [];
    for (const column in index.columns) {
      const order = index.columns[column];
      columns.push(`"${schema[column]?._dbname_us || column}" ${order === -1 ? 'DESC' : 'ASC'}`);
    }
    const unique = index.options.unique ? 'UNIQUE ' : '';
    const sql = `CREATE ${unique}INDEX "${index.options.name}" ON "${table_name}" (${columns.join(',')})`;
    try {
      await this._pool.query(sql);
    } catch (error: any) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
  }

  /** @internal */
  public async createForeignKey(model_name: string, column: string, type: string, references: any) {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return;
    }
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
    const sql = `ALTER TABLE "${table_name}" ADD FOREIGN KEY ("${column}")
      REFERENCES "${references.table_name}"(id) ON DELETE ${action}`;
    try {
      await this._pool.query(sql);
    } catch (error: any) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
  }

  /** @internal */
  public async deleteAllIgnoringConstraint(model_list: string[]): Promise<void> {
    await Promise.all(
      model_list.map(async (model_name) => {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
          return;
        }
        const table_name = model_class.table_name;
        await this.query(`ALTER TABLE "${table_name}" DISABLE TRIGGER ALL`);
        await this.query(`DELETE FROM "${table_name}"`);
        await this.query(`ALTER TABLE "${table_name}" ENABLE TRIGGER ALL`);
      }),
    );
  }

  /** @internal */
  public async drop(model_name: string) {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return;
    }
    const table_name = model_class.table_name;
    try {
      await this._pool.query(`DROP TABLE IF EXISTS "${table_name}"`);
    } catch (error: any) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
  }

  /** @internal */
  public getAdapterTypeString(column_property: ColumnPropertyInternal): string | undefined {
    return _typeToSQL(column_property);
  }

  /** @internal */
  public async create(
    model_name: string,
    data: any,
    options: { transaction?: Transaction; use_id_in_data?: boolean },
  ): Promise<any> {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      throw new Error('model not found');
    }
    const table_name = model_class.table_name;
    const values: any[] = [];
    const [fields, places] = this._buildUpdateSet(model_name, data, values, true, options.use_id_in_data);
    const sql = `INSERT INTO "${table_name}" (${fields}) VALUES (${places}) RETURNING id`;
    let result;
    try {
      result = await this.query(sql, values, options.transaction);
    } catch (error: any) {
      throw _processSaveError(table_name, error);
    }
    const rows = result && result.rows;
    if (rows && rows.length === 1 && rows[0].id) {
      return rows[0].id;
    } else {
      throw new Error('unexpected rows');
    }
  }

  /** @internal */
  public async createBulk(
    model_name: string,
    data: any[],
    options: { transaction?: Transaction; use_id_in_data?: boolean },
  ): Promise<any[]> {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      throw new Error('model not found');
    }
    const table_name = model_class.table_name;
    const values: any[] = [];
    let fields: any;
    const places: any[] = [];
    data.forEach((item) => {
      let places_sub;
      [fields, places_sub] = this._buildUpdateSet(model_name, item, values, true, options.use_id_in_data);
      places.push('(' + places_sub + ')');
    });
    const sql = `INSERT INTO "${table_name}" (${fields}) VALUES ${places.join(',')} RETURNING id`;
    let result;
    try {
      result = await this.query(sql, values, options.transaction);
    } catch (error: any) {
      throw _processSaveError(table_name, error);
    }
    const ids = result && result.rows.map((row: any) => row.id);
    if (ids && ids.length === data.length) {
      return ids;
    } else {
      throw new Error('unexpected rows');
    }
  }

  /** @internal */
  public async update(model_name: string, data: any, options: { transaction?: Transaction }) {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return;
    }
    const table_name = model_class.table_name;
    const values: any[] = [];
    const [fields] = this._buildUpdateSet(model_name, data, values);
    values.push(data.id);
    const sql = `UPDATE "${table_name}" SET ${fields} WHERE id=$${values.length}`;
    try {
      await this.query(sql, values, options.transaction);
    } catch (error: any) {
      throw _processSaveError(table_name, error);
    }
  }

  /** @internal */
  public async updatePartial(
    model_name: string,
    data: any,
    conditions: Array<Record<string, any>>,
    options: { transaction?: Transaction },
  ): Promise<number> {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return 0;
    }
    const table_name = model_class.table_name;
    const values: any[] = [];
    const [fields] = this._buildPartialUpdateSet(model_name, data, values);
    let sql = `UPDATE "${table_name}" SET ${fields}`;
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(model_class._schema, '', {}, conditions, values);
    }
    let result;
    try {
      result = await this.query(sql, values, options.transaction);
    } catch (error: any) {
      throw _processSaveError(table_name, error);
    }
    return result.rowCount;
  }

  /** @internal */
  public async findById(
    model_name: string,
    id: any,
    options: { select?: string[]; explain?: boolean; transaction?: Transaction },
  ): Promise<any> {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      throw new Error('model not found');
    }
    const select = this._buildSelect(model_class, options.select);
    const table_name = model_class.table_name;
    const sql = `SELECT ${select} FROM "${table_name}" AS _Base WHERE id=$1 LIMIT 1`;
    if (options.explain) {
      return await this.query(`EXPLAIN ${sql}`, [id], options.transaction);
    }
    let result;
    try {
      result = await this.query(sql, [id], options.transaction);
    } catch (error: any) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
    const rows = result && result.rows;
    if (rows && rows.length === 1) {
      return this._convertToModelInstance(model_name, rows[0], options);
    } else if (rows && rows.length > 1) {
      throw new Error('unknown error');
    } else {
      throw new Error('not found');
    }
  }

  /** @internal */
  public async find(
    model_name: string,
    conditions: Array<Record<string, any>>,
    options: AdapterFindOptions,
  ): Promise<any> {
    const [sql, params] = this._buildSqlForFind(model_name, conditions, options);
    if (options.explain) {
      return await this.query(`EXPLAIN ${sql}`, params, options.transaction);
    }
    let result;
    try {
      result = await this.query(sql, params, options.transaction);
    } catch (error: any) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
    const rows = result && result.rows;
    if (options.group_fields) {
      const model_class = this._connection.models[model_name];
      return rows.map((record: any) => {
        return this._convertToGroupInstance(
          model_name,
          record,
          options.group_by,
          options.group_fields,
          model_class?.query_record_id_as_string ?? false,
        );
      });
    } else {
      return rows.map((record: any) => {
        return this._convertToModelInstance(model_name, record, options);
      });
    }
  }

  /** @internal */
  public stream(
    model_name: string,
    conditions: Array<Record<string, any>>,
    options: AdapterFindOptions,
  ): stream.Readable {
    if (!QueryStream) {
      console.log('Install pg-query-stream module to use stream');
      process.exit(1);
    }
    let sql: any;
    let params: any;
    try {
      [sql, params] = this._buildSqlForFind(model_name, conditions, options);
    } catch (error: any) {
      const readable = new stream.Readable({ objectMode: true });
      readable._read = () => readable.emit('error', error);
      return readable;
    }
    const transformer = new stream.Transform({ objectMode: true });
    transformer._transform = (record, encoding, callback) => {
      transformer.push(this._convertToModelInstance(model_name, record, options));
      callback();
    };
    this._pool.connect().then((client: any) => {
      this._connection._logger.logQuery(sql, params);
      client
        .query(new QueryStream(sql, params))
        .on('end', () => {
          client.release();
        })
        .on('error', (error: any) => {
          transformer.emit('error', error);
        })
        .pipe(transformer);
    });
    return transformer;
  }

  /** @internal */
  public async count(
    model_name: string,
    conditions: Array<Record<string, any>>,
    options: AdapterCountOptions,
  ): Promise<number> {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return 0;
    }
    const select = options.select ? this._buildSelect(model_class, options.select) : '*';
    const params: any = [];
    const table_name = model_class.table_name;
    const join_schemas: Record<string, ModelSchemaInternal> = {};
    let sql =
      options.distinct && !options.select
        ? `SELECT DISTINCT _Base.* FROM "${table_name}" AS _Base`
        : `SELECT COUNT(${options.distinct ? `DISTINCT ${select}` : '*'}) AS count FROM "${table_name}" AS _Base`;
    if (options.joins.length > 0) {
      const escape_ch = this._escape_ch;
      for (const join of options.joins) {
        const join_model_class = this._connection.models[join.model_name];
        if (!join_model_class) {
          continue;
        }
        sql += ` ${join.type} ${join_model_class.table_name} AS _${join.alias}`;
        sql += ` ON _Base.${escape_ch}${join.base_column}${escape_ch} = _${join.alias}.${escape_ch}${join.join_column}${escape_ch}`;
        join_schemas[join.alias] = join_model_class._schema;
      }
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(model_class._schema, '_Base', join_schemas, conditions, params);
    }
    if (options.group_by) {
      const escape_ch = this._escape_ch;
      sql += ' GROUP BY ' + options.group_by.map((column) => `_Base.${escape_ch}${column}${escape_ch}`).join(',');
      if (options.conditions_of_group.length > 0) {
        sql += ' HAVING ' + this._buildWhere(options.group_fields, '_Base', {}, options.conditions_of_group, params);
      }
      sql = `SELECT COUNT(*) AS count FROM (${sql}) _sub`;
    }
    if (options.distinct && !options.select) {
      sql = `SELECT COUNT(*) AS count FROM (${sql}) _sub`;
    }
    let result;
    try {
      result = await this.query(sql, params, options.transaction);
    } catch (error: any) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
    const rows = result && result.rows;
    if (rows && rows.length !== 1) {
      throw new Error('unknown error');
    }
    return Number(rows[0].count);
  }

  /** @internal */
  public async delete(
    model_name: string,
    conditions: Array<Record<string, any>>,
    options: AdapterDeleteOptions,
  ): Promise<number> {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return 0;
    }
    const nested = options.orders.length > 0 || options.limit || options.skip;
    const params: any = [];
    const table_name = model_class.table_name;
    let sql = `DELETE FROM "${table_name}"`;
    if (nested) {
      sql += ` WHERE id IN (SELECT id FROM "${table_name}"`;
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(model_class._schema, '', {}, conditions, params);
    }
    if (options.orders.length > 0) {
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
        column = schema[column]?._dbname_us || column;
        return `"${column}" ${order}`;
      });
      sql += ' ORDER BY ' + orders.join(',');
    }
    if (options.limit) {
      sql += ' LIMIT ' + options.limit;
      if (options.skip) {
        sql += ' OFFSET ' + options.skip;
      }
    } else if (options.skip) {
      sql += ' LIMIT ALL OFFSET ' + options.skip;
    }
    if (nested) {
      sql += ')';
    }
    let result;
    try {
      result = await this.query(sql, params, options.transaction);
    } catch (error: any) {
      if (error.code === '23503') {
        throw new Error('rejected');
      }
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
    if (result == null) {
      throw PostgreSQLAdapter.wrapError('unknown error');
    }
    return result.rowCount;
  }

  /**
   * Connects to the database
   * @internal
   */
  public async connect(settings: AdapterSettingsPostgreSQL) {
    await module_promise;
    if (!pg) {
      console.log('Install pg module to use this adapter');
      process.exit(1);
    }

    // connect
    const pool = new pg.Pool({
      database: settings.database,
      host: settings.host,
      password: await settings.password,
      port: settings.port,
      user: await settings.user,
    });
    try {
      const client = await pool.connect();
      client.release();
      this._pool = pool;
    } catch (error: any) {
      if (error.code === '3D000') {
        throw new Error('database does not exist');
      }
      throw PostgreSQLAdapter.wrapError('failed to connect', error);
    }
  }

  /** @internal */
  public close() {
    this._pool.end();
    this._pool = null;
  }

  /** @internal */
  public async getConnection(): Promise<any> {
    const adapter_connection = await this._pool.connect();
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
      await adapter_connection.query(`START TRANSACTION ISOLATION LEVEL ${isolation_level}`);
    } else {
      await adapter_connection.query('START TRANSACTION');
    }
  }

  /** @internal */
  public async commitTransaction(adapter_connection: any): Promise<void> {
    await adapter_connection.query('COMMIT');
  }

  /** @internal */
  public async rollbackTransaction(adapter_connection: any): Promise<void> {
    await adapter_connection.query('ROLLBACK');
  }

  /**
   * Exposes pg module's query method
   */
  public async query(text: string, values?: any[], transaction?: Transaction) {
    if (!this._pool) {
      await this._connection._promise_connection;
    }
    if (transaction && transaction._adapter_connection) {
      this._connection._logger.logQuery(text, values);
      transaction.checkFinished();
      return await transaction._adapter_connection.query(text, values);
    } else {
      this._connection._logger.logQuery(text, values);
      return await this._pool.query(text, values);
    }
  }

  /** @internal */
  protected _param_place_holder(pos: any) {
    return '$' + pos;
  }

  /** @internal */
  protected valueToModel(value: any, property: ColumnPropertyInternal, query_record_id_as_string: boolean) {
    if (property.type_class === types.BigInteger) {
      return Number(value);
    } else if (property.record_id && query_record_id_as_string) {
      if (property.array) {
        return value.map((item: any) => (item ? String(item) : null));
      }
      return String(value);
    } else if (property.type_class === types.Vector) {
      return JSON.parse(value);
    }
    return value;
  }

  /** @internal */
  protected _getModelID(data: any) {
    if (!data.id) {
      return null;
    }
    return Number(data.id);
  }

  /** @internal */
  protected _buildSelect(model_class: any, select: any) {
    if (!select) {
      select = Object.keys(model_class._schema);
    }
    const schema = model_class._schema;
    const escape_ch = this._escape_ch;
    select = select.map((column: any) => {
      const property = schema[column];
      column = escape_ch + schema[column]._dbname_us + escape_ch;
      if (property.type_class === types.GeoPoint) {
        return `ARRAY[ST_X(${column}), ST_Y(${column})] AS ${column}`;
      } else {
        return '_Base.' + column;
      }
    });
    return select.join(',');
  }

  /** @internal */
  protected _buildGroupExpr(schema: ModelSchemaInternal, group_expr: any) {
    const op = Object.keys(group_expr)[0];
    if (op === '$any') {
      const sub_expr = group_expr[op];
      if (sub_expr.substr(0, 1) === '$') {
        let column = sub_expr.substr(1);
        column = schema[column]?._dbname_us || column;
        return `(ARRAY_AGG(${column}))[1]`;
      } else {
        throw new Error(`unknown expression '${JSON.stringify(op)}'`);
      }
    } else {
      return super._buildGroupExpr(schema, group_expr);
    }
  }

  /** @internal */
  private async _getTables(): Promise<string[]> {
    const query = `SELECT table_name FROM INFORMATION_SCHEMA.TABLES
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != 'spatial_ref_sys'`;
    const result = await this._pool.query(query);
    const tables = result.rows.map((table: any) => table.table_name);
    return tables;
  }

  /** @internal */
  private async _getSchema(table: string): Promise<SchemasTable> {
    const query = 'SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name=$1';
    const result = await this._pool.query(query, [table]);
    const schema: SchemasTable = { columns: {} };
    for (const column of result.rows) {
      const type =
        column.data_type === 'character varying'
          ? new types.String(column.character_maximum_length)
          : column.data_type === 'double precision'
            ? new types.Number()
            : column.data_type === 'boolean'
              ? new types.Boolean()
              : column.data_type === 'integer'
                ? new types.Integer()
                : column.data_type === 'bigint'
                  ? new types.BigInteger()
                  : column.data_type === 'USER-DEFINED' &&
                      column.udt_schema === 'public' &&
                      column.udt_name === 'geometry'
                    ? new types.GeoPoint()
                    : column.data_type === 'vector'
                      ? new types.Vector()
                      : column.data_type === 'timestamp without time zone'
                        ? new types.Date()
                        : column.data_type === 'json'
                          ? new types.Object()
                          : column.data_type === 'text'
                            ? new types.Text()
                            : column.data_type === 'bytea'
                              ? new types.Blob()
                              : undefined;
      let adapter_type_string = column.data_type.toUpperCase();
      if (column.data_type === 'character varying') {
        adapter_type_string += `(${column.character_maximum_length || 255})`;
      }
      schema.columns[column.column_name] = {
        required: column.is_nullable === 'NO',
        type,
        adapter_type_string,
      };
    }
    return schema;
  }

  /** @internal */
  private async _getIndexes(): Promise<{ [table_name: string]: SchemasIndex | undefined }> {
    // see http://stackoverflow.com/a/2213199/3239514
    const query = `SELECT t.relname AS table_name, i.relname AS index_name, a.attname AS column_name
      FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
      WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)`;
    const result = await this._pool.query(query);
    const indexes: { [table_name: string]: SchemasIndex | undefined } = {};
    for (const row of result.rows) {
      if (row.index_name === `${row.table_name}_pkey`) {
        continue;
      }
      const indexes_of_table = indexes[row.table_name] || (indexes[row.table_name] = {});
      (indexes_of_table[row.index_name] || (indexes_of_table[row.index_name] = {}))[row.column_name] = 1;
    }
    return indexes;
  }

  /** @internal */
  private async _getForeignKeys(): Promise<any> {
    // see http://stackoverflow.com/a/1152321/3239514
    const query = `SELECT tc.table_name AS table_name, kcu.column_name AS column_name,
        ccu.table_name AS referenced_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY'`;
    const result = await this._pool.query(query);
    const foreign_keys: any = {};
    for (const row of result.rows) {
      const foreign_keys_of_table = foreign_keys[row.table_name] || (foreign_keys[row.table_name] = {});
      foreign_keys_of_table[row.column_name] = row.referenced_table_name;
    }
    return foreign_keys;
  }

  /** @internal */
  private _buildUpdateSetOfColumn(
    property: any,
    data: any,
    values: any,
    fields: any[],
    places: any[],
    insert: boolean = false,
  ) {
    const dbname = property._dbname_us;
    const value = data[dbname];
    if (property.type_class === types.GeoPoint) {
      values.push(value[0]);
      values.push(value[1]);
      if (insert) {
        fields.push(`"${dbname}"`);
        places.push(`ST_Point($${values.length - 1}, $${values.length})`);
      } else {
        fields.push(`"${dbname}"=ST_Point($${values.length - 1}, $${values.length})`);
      }
    } else if (property.type_class === types.Vector) {
      values.push(value != null ? JSON.stringify(value) : null);
      if (insert) {
        fields.push(`"${dbname}"`);
        places.push(`$${values.length}`);
      } else {
        fields.push(`"${dbname}"=$${values.length}`);
      }
    } else if (value && value.$inc != null) {
      values.push(value.$inc);
      fields.push(`"${dbname}"="${dbname}"+$${values.length}`);
    } else {
      values.push(value);
      if (insert) {
        fields.push(`"${dbname}"`);
        places.push('$' + values.length);
      } else {
        fields.push(`"${dbname}"=$${values.length}`);
      }
    }
  }

  /** @internal */
  private _buildUpdateSet(
    model_name: string,
    data: any,
    values: any,
    insert: boolean = false,
    use_id_in_data?: boolean,
  ) {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return ['', ''];
    }
    const schema = model_class._schema;
    const fields: any[] = [];
    const places: any[] = [];
    for (const column in schema) {
      const property = schema[column];
      if (property?.primary_key) {
        continue;
      }
      this._buildUpdateSetOfColumn(property, data, values, fields, places, insert);
    }
    if (use_id_in_data && data.id) {
      values.push(data.id);
      fields.push('id');
      places.push('$' + values.length);
    }
    return [fields.join(','), places.join(',')];
  }

  /** @internal */
  private _buildPartialUpdateSet(model_name: string, data: any, values: any[]) {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return ['', ''];
    }
    const schema = model_class._schema;
    const fields: any[] = [];
    const places: any[] = [];
    for (const column in data) {
      const property = _.find(schema, (item) => item?._dbname_us === column);
      if (!property || property.primary_key) {
        continue;
      }
      this._buildUpdateSetOfColumn(property, data, values, fields, places);
    }
    return [fields.join(','), places.join(',')];
  }

  /** @internal */
  private _buildSqlForFind(
    model_name: string,
    conditions: Array<Record<string, any>>,
    options: AdapterFindOptions,
  ): [string, any[]] {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return ['', []];
    }
    let select;
    if (options.group_by || options.group_fields) {
      select = this._buildGroupFields(model_class, options.group_by, options.group_fields);
    } else {
      select = this._buildSelect(model_class, options.select);
    }
    let order_by;
    if (options.near != null && Object.keys(options.near)[0]) {
      const field = Object.keys(options.near)[0];
      order_by = `"${field}_distance"`;
      const location = options.near[field];
      select += `,ST_Distance("${field}",ST_Point(${location[0]},${location[1]})) AS "${field}_distance"`;
    }
    const params: any[] = [];
    const table_name = model_class.table_name;
    const join_schemas: Record<string, ModelSchemaInternal> = {};
    let sql = `SELECT ${options.distinct ? 'DISTINCT' : ''} ${select} FROM "${table_name}" as _Base`;
    if (options.joins.length > 0) {
      const escape_ch = this._escape_ch;
      for (const join of options.joins) {
        const join_model_class = this._connection.models[join.model_name];
        if (!join_model_class) {
          continue;
        }
        sql += ` ${join.type} ${join_model_class.table_name} AS _${join.alias}`;
        sql += ` ON _Base.${escape_ch}${join.base_column}${escape_ch} = _${join.alias}.${escape_ch}${join.join_column}${escape_ch}`;
        join_schemas[join.alias] = join_model_class._schema;
      }
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(model_class._schema, '_Base', join_schemas, conditions, params);
    }
    if (options.group_by) {
      const escape_ch = this._escape_ch;
      sql += ' GROUP BY ' + options.group_by.map((column) => `_Base.${escape_ch}${column}${escape_ch}`).join(',');
    }
    if (options.conditions_of_group.length > 0) {
      sql += ' HAVING ' + this._buildWhere(options.group_fields, '_Base', {}, options.conditions_of_group, params);
    }
    if (options.orders.length > 0 || order_by) {
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
        column = schema[column]?._dbname_us || column;
        return `"${column}" ${order}`;
      });
      if (order_by) {
        orders.push(order_by);
      }
      sql += ' ORDER BY ' + orders.join(',');
    } else if (
      options.vector_order &&
      typeof options.vector_order === 'object' &&
      Object.keys(options.vector_order).length === 1
    ) {
      const column = Object.keys(options.vector_order)[0];
      const cond = options.vector_order[column];
      if (cond && typeof cond === 'object' && Object.keys(cond).length === 1) {
        const key = Object.keys(cond)[0];
        const value = Object.values(cond)[0];
        let op = '';
        if (key === '$l2_distance') {
          op = '<->';
        } else if (key === '$l1_distance') {
          op = '<+>';
        } else if (key === '$cosine_distance') {
          op = '<=>';
        } else if (key === '$negative_inner_product') {
          op = '<#>';
        } else if (key === '$hamming_distance') {
          op = '<~>';
        } else if (key === '$jaccard_distance') {
          op = '<%>';
        }
        if (op) {
          params.push(value != null ? JSON.stringify(value) : null);
          sql += ` ORDER BY _Base."${column}" ${op} $${params.length}`;
        }
      }
    }
    if (options.limit) {
      sql += ' LIMIT ' + options.limit;
      if (options.skip) {
        sql += ' OFFSET ' + options.skip;
      }
    } else if (options.skip) {
      sql += ' LIMIT ALL OFFSET ' + options.skip;
    }
    return [sql, params];
  }
}

export function createAdapter(connection: Connection) {
  return new PostgreSQLAdapter(connection);
}
