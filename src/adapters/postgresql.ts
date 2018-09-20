let pg: any;
// tslint:disable-next-line:variable-name
let QueryStream: any;

try {
  // tslint:disable-next-line:no-var-requires
  pg = require('pg');
} catch (error) {
  console.log('Install pg module to use this adapter');
  process.exit(1);
}

try {
  // tslint:disable-next-line:no-var-requires
  QueryStream = require('pg-query-stream');
} catch (error) { /**/ }

export interface IAdapterSettingsPostgreSQL {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database: string;
}

import * as _ from 'lodash';
import * as stream from 'stream';
import * as types from '../types';
import { ISchemas } from './base';
import { SQLAdapterBase } from './sql_base';

function _typeToSQL(property: any) {
  if (property.array) {
    return 'JSON';
  }
  switch (property.type_class) {
    case types.String:
      return `VARCHAR(${property.type.length || 255})`;
    case types.Number:
      return 'DOUBLE PRECISION';
    case types.Boolean:
      return 'BOOLEAN';
    case types.Integer:
      return 'INT';
    case types.GeoPoint:
      return 'GEOMETRY(POINT)';
    case types.Date:
      return 'TIMESTAMP WITHOUT TIME ZONE';
    case types.Object:
      return 'JSON';
    case types.Text:
      return 'TEXT';
  }
}

function _propertyToSQL(property: any) {
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

function _processSaveError(tableName: any, error: any) {
  if (error.code === '42P01') {
    return new Error('table does not exist');
  } else if (error.code === '23505') {
    let column = '';
    let key = error.message.match(/unique constraint \"(.*)\"/);
    if (key != null) {
      column = key[1];
      key = column.match(new RegExp(`${tableName}_([^']*)_key`));
      if (key != null) {
        column = key[1];
      }
      column = ' ' + column;
    }
    return new Error('duplicated' + column);
  } else {
    return PostgreSQLAdapter.wrapError('unknown error', error);
  }
}

// Adapter for PostgreSQL
// @namespace adapter
class PostgreSQLAdapter extends SQLAdapterBase {
  public key_type: any = types.Integer;

  public support_geopoint = true;

  public support_string_type_with_length = true;

  public native_integrity = true;

  protected _contains_op = 'ILIKE';

  protected _regexp_op = '~*';

  private _pool: any;

  // Creates a PostgreSQL adapter
  constructor(connection: any) {
    super();
    this._connection = connection;
  }

  public async getSchemas(): Promise<ISchemas> {
    const tables = await this._getTables();
    const table_schemas: { [tableName: string]: any } = {};
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

  public async createTable(model: string) {
    const model_class = this._connection.models[model];
    const tableName = model_class.tableName;
    const column_sqls = [];
    column_sqls.push('id SERIAL PRIMARY KEY');
    // tslint:disable-next-line:forin
    for (const column in model_class._schema) {
      const property = model_class._schema[column];
      const column_sql = _propertyToSQL(property);
      if (column_sql) {
        column_sqls.push(`"${property._dbname}" ${column_sql}`);
      }
    }
    const sql = `CREATE TABLE "${tableName}" ( ${column_sqls.join(',')} )`;
    try {
      await this._pool.query(sql);
    } catch (error) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
  }

  public async addColumn(model: string, column_property: any) {
    const model_class = this._connection.models[model];
    const tableName = model_class.tableName;
    const sql = `ALTER TABLE "${tableName}" ADD COLUMN "${column_property._dbname}" ${_propertyToSQL(column_property)}`;
    try {
      await this._pool.query(sql);
    } catch (error) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
  }

  public async createIndex(model: string, index: any) {
    const model_class = this._connection.models[model];
    const tableName = model_class.tableName;
    const columns = [];
    // tslint:disable-next-line:forin
    for (const column in index.columns) {
      const order = index.columns[column];
      columns.push(`"${column}" ${(order === -1 ? 'DESC' : 'ASC')}`);
    }
    const unique = index.options.unique ? 'UNIQUE ' : '';
    const sql = `CREATE ${unique}INDEX "${index.options.name}" ON "${tableName}" (${columns.join(',')})`;
    try {
      await this._pool.query(sql);
    } catch (error) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
  }

  public async createForeignKey(model: string, column: string, type: string, references: any) {
    const model_class = this._connection.models[model];
    const tableName = model_class.tableName;
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
    const sql = `ALTER TABLE "${tableName}" ADD FOREIGN KEY ("${column}")
      REFERENCES "${references.tableName}"(id) ON DELETE ${action}`;
    try {
      await this._pool.query(sql);
    } catch (error) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
  }

  public async drop(model: string) {
    const tableName = this._connection.models[model].tableName;
    try {
      await this._pool.query(`DROP TABLE IF EXISTS "${tableName}"`);
    } catch (error) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
  }

  public async create(model: string, data: object): Promise<any> {
    const tableName = this._connection.models[model].tableName;
    const values: any[] = [];
    const [fields, places] = this._buildUpdateSet(model, data, values, true);
    const sql = `INSERT INTO "${tableName}" (${fields}) VALUES (${places}) RETURNING id`;
    let result;
    try {
      result = await this._pool.query(sql, values);
    } catch (error) {
      throw _processSaveError(tableName, error);
    }
    const rows = result && result.rows;
    if (rows && rows.length === 1 && rows[0].id) {
      return rows[0].id;
    } else {
      throw new Error('unexpected rows');
    }
  }

  public async createBulk(model: string, data: object[]): Promise<any[]> {
    const tableName = this._connection.models[model].tableName;
    const values: any[] = [];
    let fields: any;
    const places: any[] = [];
    data.forEach((item) => {
      let places_sub;
      [fields, places_sub] = this._buildUpdateSet(model, item, values, true);
      places.push('(' + places_sub + ')');
    });
    const sql = `INSERT INTO "${tableName}" (${fields}) VALUES ${places.join(',')} RETURNING id`;
    let result;
    try {
      result = await this._pool.query(sql, values);
    } catch (error) {
      throw _processSaveError(tableName, error);
    }
    const ids = result && result.rows.map((row: any) => row.id);
    if (ids && ids.length === data.length) {
      return ids;
    } else {
      throw new Error('unexpected rows');
    }
  }

  public async update(model: string, data: any) {
    const tableName = this._connection.models[model].tableName;
    const values: any[] = [];
    const [fields] = this._buildUpdateSet(model, data, values);
    values.push(data.id);
    const sql = `UPDATE "${tableName}" SET ${fields} WHERE id=$${values.length}`;
    try {
      await this._pool.query(sql, values);
    } catch (error) {
      throw _processSaveError(tableName, error);
    }
  }

  public async updatePartial(model: string, data: any, conditions: any, options: any): Promise<number> {
    const tableName = this._connection.models[model].tableName;
    const values: any[] = [];
    const [fields] = this._buildPartialUpdateSet(model, data, values);
    let sql = `UPDATE "${tableName}" SET ${fields}`;
    if (conditions.length > 0) {
      try {
        sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, values);
      } catch (error) {
        throw error;
      }
    }
    let result;
    try {
      result = (await this._pool.query(sql, values));
    } catch (error) {
      throw _processSaveError(tableName, error);
    }
    return result.rowCount;
  }

  public async findById(model: any, id: any, options: any): Promise<any> {
    const select = this._buildSelect(this._connection.models[model], options.select);
    const tableName = this._connection.models[model].tableName;
    const sql = `SELECT ${select} FROM "${tableName}" WHERE id=$1 LIMIT 1`;
    if (options.explain) {
      return (await this._pool.query(`EXPLAIN ${sql}`, [id]));
    }
    let result;
    try {
      result = (await this._pool.query(sql, [id]));
    } catch (error) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
    const rows = result && result.rows;
    if (rows && rows.length === 1) {
      return this._convertToModelInstance(model, rows[0], options);
    } else if (rows && rows.length > 1) {
      throw new Error('unknown error');
    } else {
      throw new Error('not found');
    }
  }

  public async find(model: any, conditions: any, options: any): Promise<any> {
    const [sql, params] = this._buildSqlForFind(model, conditions, options);
    if (options.explain) {
      return await this._pool.query(`EXPLAIN ${sql}`, params);
    }
    let result;
    try {
      result = await this._pool.query(sql, params);
    } catch (error) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
    const rows = result && result.rows;
    if (options.group_fields) {
      return rows.map((record: any) => {
        return this._convertToGroupInstance(model, record, options.group_by, options.group_fields);
      });
    } else {
      return rows.map((record: any) => {
        return this._convertToModelInstance(model, record, options);
      });
    }
  }

  public stream(model: any, conditions: any, options: any): stream.Readable {
    if (!QueryStream) {
      console.log('Install pg-query-stream module to use stream');
      process.exit(1);
    }
    let sql: any;
    let params: any;
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
    this._pool.connect().then((client: any) => {
      client.query(new QueryStream(sql, params)).on('end', () => {
        client.release();
      }).on('error', (error: any) => {
        transformer.emit('error', error);
      }).pipe(transformer);
    });
    return transformer;
  }

  public async count(model: any, conditions: any, options: any): Promise<number> {
    const params: any = [];
    const tableName = this._connection.models[model].tableName;
    let sql = `SELECT COUNT(*) AS count FROM "${tableName}"`;
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, params);
    }
    if (options.group_by) {
      sql += ' GROUP BY ' + options.group_by.join(',');
      if (options.conditions_of_group.length > 0) {
        sql += ' HAVING ' + this._buildWhere(options.group_fields, options.conditions_of_group, params);
      }
      sql = `SELECT COUNT(*) AS count FROM (${sql}) _sub`;
    }
    let result;
    try {
      result = await this._pool.query(sql, params);
    } catch (error) {
      throw PostgreSQLAdapter.wrapError('unknown error', error);
    }
    const rows = result && result.rows;
    if (rows && rows.length !== 1) {
      throw new Error('unknown error');
    }
    return Number(rows[0].count);
  }

  public async delete(model: any, conditions: any): Promise<number> {
    const params: any = [];
    const tableName = this._connection.models[model].tableName;
    let sql = `DELETE FROM "${tableName}"`;
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, params);
    }
    let result;
    try {
      result = await this._pool.query(sql, params);
    } catch (error) {
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
   */
  public async connect(settings: IAdapterSettingsPostgreSQL) {
    // connect
    const pool = new pg.Pool({
      database: settings.database,
      host: settings.host,
      password: settings.password,
      port: settings.port,
      user: settings.user,
    });
    try {
      const client = await pool.connect();
      client.release();
      this._pool = pool;
    } catch (error) {
      if (error.code === '3D000') {
        throw new Error('database does not exist');
      }
      throw PostgreSQLAdapter.wrapError('failed to connect', error);
    }
  }

  public close() {
    this._pool.end();
    this._pool = null;
  }

  /**
   * Exposes pg module's query method
   */
  public query() {
    return this._pool.query.apply(this._pool, arguments);
  }

  protected _param_place_holder(pos: any) {
    return '$' + pos;
  }

  protected valueToModel(value: any, property: any) {
    return value;
  }

  protected _getModelID(data: any) {
    return Number(data.id);
  }

  protected _buildSelect(model_class: any, select: any) {
    if (!select) {
      select = Object.keys(model_class._schema);
    }
    if (select.length > 0) {
      const schema = model_class._schema;
      const escape_ch = this._escape_ch;
      select = select.map((column: any) => {
        const property = schema[column];
        column = escape_ch + schema[column]._dbname + escape_ch;
        if (property.type_class === types.GeoPoint) {
          return `ARRAY[ST_X(${column}), ST_Y(${column})] AS ${column}`;
        } else {
          return column;
        }
      });
      return 'id,' + select.join(',');
    } else {
      return 'id';
    }
  }

  private async _getTables(): Promise<any> {
    const query = `SELECT table_name FROM INFORMATION_SCHEMA.TABLES
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
    const result = await this._pool.query(query);
    const tables = result.rows.map((table: any) => table.table_name);
    return tables;
  }

  private async _getSchema(table: string): Promise<any> {
    const query = 'SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name=$1';
    const result = await this._pool.query(query, [table]);
    const schema: any = {};
    for (const column of result.rows) {
      const type = column.data_type === 'character varying' ? new types.String(column.character_maximum_length)
        : column.data_type === 'double precision' ? new types.Number()
          : column.data_type === 'boolean' ? new types.Boolean()
            : column.data_type === 'integer' ? new types.Integer()
              : column.data_type === 'USER-DEFINED' && column.udt_schema === 'public' && column.udt_name === 'geometry'
                ? new types.GeoPoint()
                : column.data_type === 'timestamp without time zone' ? new types.Date()
                  : column.data_type === 'json' ? new types.Object()
                    : column.data_type === 'text' ? new types.Text() : undefined;
      schema[column.column_name] = {
        required: column.is_nullable === 'NO',
        type,
      };
    }
    return schema;
  }

  private async _getIndexes(): Promise<any> {
    // see http://stackoverflow.com/a/2213199/3239514
    const query = `SELECT t.relname AS table_name, i.relname AS index_name, a.attname AS column_name
      FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
      WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)`;
    const result = await this._pool.query(query);
    const indexes: any = {};
    for (const row of result.rows) {
      const indexes_of_table = indexes[row.table_name] || (indexes[row.table_name] = {});
      (indexes_of_table[row.index_name] || (indexes_of_table[row.index_name] = {}))[row.column_name] = 1;
    }
    return indexes;
  }

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

  private _buildUpdateSetOfColumn(property: any, data: any, values: any, fields: any[], places: any[], insert?: any) {
    const dbname = property._dbname;
    const value = data[dbname];
    if (property.type_class === types.GeoPoint) {
      values.push(value[0]);
      values.push(value[1]);
      if (insert) {
        fields.push(`"${dbname}"`);
        return places.push(`ST_Point($${values.length - 1}, $${values.length})`);
      } else {
        return fields.push(`"${dbname}"=ST_Point($${values.length - 1}, $${values.length})`);
      }
    } else if ((value != null ? value.$inc : void 0) != null) {
      values.push(value.$inc);
      return fields.push(`"${dbname}"="${dbname}"+$${values.length}`);
    } else {
      values.push(value);
      if (insert) {
        fields.push(`"${dbname}"`);
        return places.push('$' + values.length);
      } else {
        return fields.push(`"${dbname}"=$${values.length}`);
      }
    }
  }

  private _buildUpdateSet(model: string, data: any, values: any, insert?: boolean) {
    const schema = this._connection.models[model]._schema;
    const fields: any[] = [];
    const places: any[] = [];
    // tslint:disable-next-line:forin
    for (const column in schema) {
      const property = schema[column];
      this._buildUpdateSetOfColumn(property, data, values, fields, places, insert);
    }
    return [fields.join(','), places.join(',')];
  }

  private _buildPartialUpdateSet(model: string, data: any, values: any[]) {
    const schema = this._connection.models[model]._schema;
    const fields: any[] = [];
    const places: any[] = [];
    // tslint:disable-next-line:forin
    for (const column in data) {
      const value = data[column];
      const property = _.find(schema, (item) => item._dbname === column);
      this._buildUpdateSetOfColumn(property, data, values, fields, places);
    }
    return [fields.join(','), places.join(',')];
  }

  private _buildSqlForFind(model: any, conditions: any, options: any) {
    let select;
    if (options.group_by || options.group_fields) {
      select = this._buildGroupFields(options.group_by, options.group_fields);
    } else {
      select = this._buildSelect(this._connection.models[model], options.select);
    }
    let order_by;
    if (options.near != null && Object.keys(options.near)[0]) {
      const field = Object.keys(options.near)[0];
      order_by = `"${field}_distance"`;
      const location = options.near[field];
      select += `,ST_Distance("${field}",ST_Point(${location[0]},${location[1]})) AS "${field}_distance"`;
    }
    const params: any[] = [];
    const tableName = this._connection.models[model].tableName;
    let sql = `SELECT ${select} FROM "${tableName}"`;
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, params);
    }
    if (options.group_by) {
      sql += ' GROUP BY ' + options.group_by.join(',');
    }
    if (options.conditions_of_group.length > 0) {
      sql += ' HAVING ' + this._buildWhere(options.group_fields, options.conditions_of_group, params);
    }
    if ((options && options.orders.length > 0) || order_by) {
      const model_class = this._connection.models[model];
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
        column = schema[column] && schema[column]._dbname || column;
        return `"${column}" ${order}`;
      });
      if (order_by) {
        orders.push(order_by);
      }
      sql += ' ORDER BY ' + orders.join(',');
    }
    if ((options != null ? options.limit : void 0) != null) {
      sql += ' LIMIT ' + options.limit;
      if ((options != null ? options.skip : void 0) != null) {
        sql += ' OFFSET ' + options.skip;
      }
    } else if ((options != null ? options.skip : void 0) != null) {
      sql += ' LIMIT ALL OFFSET ' + options.skip;
    }
    return [sql, params];
  }
}

export default (connection: any) => {
  return new PostgreSQLAdapter(connection);
};