let sqlite3: any;

try {
  // tslint:disable-next-line:no-var-requires
  sqlite3 = require('sqlite3');
} catch (error) {
  console.log('Install sqlite3 module to use this adapter');
  process.exit(1);
}

export interface IAdapterSettingsSQLite3 {
  database: string;
}

import * as _ from 'lodash';
import * as stream from 'stream';
import * as util from 'util';
import * as types from '../types';
import { ISchemas } from './base';
import { SQLAdapterBase } from './sql_base';

function _typeToSQL(property: any) {
  if (property.array) {
    return 'TEXT';
  }
  switch (property.type_class) {
    case types.String:
      return 'TEXT';
    case types.Number:
      return 'DOUBLE';
    case types.Boolean:
      return 'TINYINT';
    case types.Integer:
      return 'INT';
    case types.Date:
      return 'REAL';
    case types.Object:
      return 'TEXT';
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

function _processSaveError(error: any) {
  if (/no such table/.test(error.message)) {
    return new Error('table does not exist');
  } else if (error.code === 'SQLITE_CONSTRAINT') {
    return new Error('duplicated');
  } else {
    return SQLite3Adapter.wrapError('unknown error', error);
  }
}

// Adapter for SQLite3
// @namespace adapter
class SQLite3Adapter extends SQLAdapterBase {
  public key_type: any = types.Integer;

  public native_integrity = true;

  protected _regexp_op = null;

  protected _false_value = '0';

  private _client: any;

  // Creates a SQLite3 adapter
  constructor(connection: any) {
    super();
    this._connection = connection;
  }

  public async getSchemas(): Promise<ISchemas> {
    const tables = await this._getTables();
    const table_schemas: { [table_name: string]: any } = {};
    const all_indexes: any = {};
    for (const table of tables) {
      table_schemas[table] = await this._getSchema(table);
      all_indexes[table] = await this._getIndexes(table);
    }
    return {
      indexes: all_indexes,
      tables: table_schemas,
    };
  }

  public async createTable(model: string) {
    const model_class = this._connection.models[model];
    const table_name = model_class.table_name;
    const column_sqls: any[] = [];
    column_sqls.push('id INTEGER PRIMARY KEY AUTOINCREMENT');
    // tslint:disable-next-line:forin
    for (const column in model_class._schema) {
      const property = model_class._schema[column];
      const column_sql = _propertyToSQL(property);
      if (column_sql) {
        column_sqls.push(`"${property._dbname}" ${column_sql}`);
      }
    }
    for (const integrity of model_class._integrities) {
      const parenttable_name = integrity.parent && integrity.parent.table_name || '';
      if (integrity.type === 'child_nullify') {
        column_sqls.push(`FOREIGN KEY ("${integrity.column}") REFERENCES "${parenttable_name}"(id) ON DELETE SET NULL`);
      } else if (integrity.type === 'child_restrict') {
        column_sqls.push(`FOREIGN KEY ("${integrity.column}") REFERENCES "${parenttable_name}"(id) ON DELETE RESTRICT`);
      } else if (integrity.type === 'child_delete') {
        column_sqls.push(`FOREIGN KEY ("${integrity.column}") REFERENCES "${parenttable_name}"(id) ON DELETE CASCADE`);
      }
    }
    const sql = `CREATE TABLE "${table_name}" ( ${column_sqls.join(',')} )`;
    try {
      await this._client.runAsync(sql);
    } catch (error) {
      throw SQLite3Adapter.wrapError('unknown error', error);
    }
  }

  public async addColumn(model: string, column_property: any) {
    const model_class = this._connection.models[model];
    const table_name = model_class.table_name;
    const sql = `ALTER TABLE "${table_name}" ADD COLUMN "${column_property._dbname}" ${_propertyToSQL(column_property)}`;
    try {
      await this._client.runAsync(sql);
    } catch (error) {
      throw SQLite3Adapter.wrapError('unknown error', error);
    }
  }

  public async createIndex(model: string, index: any) {
    const model_class = this._connection.models[model];
    const table_name = model_class.table_name;
    const columns = [];
    // tslint:disable-next-line:forin
    for (const column in index.columns) {
      const order = index.columns[column];
      columns.push(`"${column}" ${(order === -1 ? 'DESC' : 'ASC')}`);
    }
    const unique = index.options.unique ? 'UNIQUE ' : '';
    const sql = `CREATE ${unique}INDEX "${index.options.name}" ON "${table_name}" (${columns.join(',')})`;
    try {
      await this._client.runAsync(sql);
    } catch (error) {
      throw SQLite3Adapter.wrapError('unknown error', error);
    }
  }

  public async drop(model: string) {
    const table_name = this._connection.models[model].table_name;
    try {
      await this._client.runAsync(`DROP TABLE IF EXISTS "${table_name}"`);
    } catch (error) {
      throw SQLite3Adapter.wrapError('unknown error', error);
    }
  }

  public async create(model: string, data: object): Promise<any> {
    const table_name = this._connection.models[model].table_name;
    const values: any[] = [];
    const [fields, places] = this._buildUpdateSet(model, data, values, true);
    const sql = `INSERT INTO "${table_name}" (${fields}) VALUES (${places})`;
    let id;
    try {
      id = await new Promise((resolve, reject) => {
        this._client.run(sql, values, function(this: any, error: any) {
          if (error) {
            reject(error);
          } else {
            resolve(this.lastID);
          }
        });
      });
    } catch (error) {
      throw _processSaveError(error);
    }
    return id;
  }

  public async createBulk(model: string, data: object[]): Promise<any[]> {
    const table_name = this._connection.models[model].table_name;
    const values: any[] = [];
    let fields: any;
    const places: any[] = [];
    data.forEach((item) => {
      let places_sub;
      [fields, places_sub] = this._buildUpdateSet(model, item, values, true);
      return places.push('(' + places_sub + ')');
    });
    const sql = `INSERT INTO "${table_name}" (${fields}) VALUES ${places.join(',')}`;
    let id: any;
    try {
      id = await new Promise((resolve, reject) => {
        this._client.run(sql, values, function(this: any, error: any) {
          if (error) {
            reject(error);
          } else {
            resolve(this.lastID);
          }
        });
      });
    } catch (error) {
      throw _processSaveError(error);
    }
    if (id) {
      id = id - data.length + 1;
      return data.map((item, i) => id + i);
    } else {
      throw new Error('unexpected result');
    }
  }

  public async update(model: string, data: any) {
    const table_name = this._connection.models[model].table_name;
    const values: any[] = [];
    const [fields] = this._buildUpdateSet(model, data, values);
    values.push(data.id);
    const sql = `UPDATE "${table_name}" SET ${fields} WHERE id=?`;
    try {
      await this._client.runAsync(sql, values);
    } catch (error) {
      throw _processSaveError(error);
    }
  }

  public async updatePartial(model: string, data: any, conditions: any, options: any): Promise<number> {
    const table_name = this._connection.models[model].table_name;
    const values: any[] = [];
    const [fields] = this._buildPartialUpdateSet(model, data, values);
    let sql = `UPDATE "${table_name}" SET ${fields}`;
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, values);
    }
    try {
      return await new Promise<number>((resolve, reject) => {
        this._client.run(sql, values, function(this: any, error: any) {
          if (error) {
            reject(error);
          } else {
            resolve(this.changes);
          }
        });
      });
    } catch (error) {
      throw _processSaveError(error);
    }
  }

  public async findById(model: any, id: any, options: any): Promise<any> {
    const select = this._buildSelect(this._connection.models[model], options.select);
    const table_name = this._connection.models[model].table_name;
    const sql = `SELECT ${select} FROM "${table_name}" WHERE id=? LIMIT 1`;
    if (options.explain) {
      return await this._client.allAsync(`EXPLAIN QUERY PLAN ${sql}`, id);
    }
    let result;
    try {
      result = (await this._client.allAsync(sql, id));
    } catch (error) {
      throw SQLite3Adapter.wrapError('unknown error', error);
    }
    if (result && result.length === 1) {
      return this._convertToModelInstance(model, result[0], options);
    } else if (result && result.length > 1) {
      throw new Error('unknown error');
    } else {
      throw new Error('not found');
    }
  }

  public async find(model: any, conditions: any, options: any): Promise<any> {
    const [sql, params] = this._buildSqlForFind(model, conditions, options);
    if (options.explain) {
      return await this._client.allAsync(`EXPLAIN QUERY PLAN ${sql}`, params);
    }
    let result;
    try {
      result = (await this._client.allAsync(sql, params));
    } catch (error) {
      throw SQLite3Adapter.wrapError('unknown error', error);
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

  public stream(model: any, conditions: any, options: any): stream.Readable {
    let sql;
    let params;
    try {
      [sql, params] = this._buildSqlForFind(model, conditions, options);
    } catch (error) {
      const r = new stream.Readable({ objectMode: true });
      r._read = () => r.emit('error', error);
      return r;
    }
    const readable = new stream.Readable({ objectMode: true });
    readable._read = () => { /**/ };
    this._client.each(sql, params, (error: any, record: any) => {
      if (error) {
        readable.emit('error', error);
        return;
      }
      readable.push(this._convertToModelInstance(model, record, options));
    }, () => {
      readable.push(null);
    });
    return readable;
  }

  public async count(model: any, conditions: any, options: any): Promise<number> {
    const params: any = [];
    const table_name = this._connection.models[model].table_name;
    let sql = `SELECT COUNT(*) AS count FROM "${table_name}"`;
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, params);
    }
    if (options.group_by) {
      sql += ' GROUP BY ' + options.group_by.join(',');
      if (options.conditions_of_group.length > 0) {
        sql += ' HAVING ' + this._buildWhere(options.group_fields, options.conditions_of_group, params);
      }
      sql = `SELECT COUNT(*) AS count FROM (${sql})`;
    }
    let result;
    try {
      result = await this._client.allAsync(sql, params);
    } catch (error) {
      throw SQLite3Adapter.wrapError('unknown error', error);
    }
    if (result && result.length !== 1) {
      throw new Error('unknown error');
    }
    return Number(result[0].count);
  }

  public async delete(model: any, conditions: any): Promise<number> {
    const params: any = [];
    const table_name = this._connection.models[model].table_name;
    let sql = `DELETE FROM "${table_name}"`;
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, params);
    }
    try {
      return await new Promise<number>((resolve, reject) => {
        this._client.run(sql, params, function(this: any, error: any) {
          if (error) {
            reject(error);
          } else {
            resolve(this.changes);
          }
        });
      });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new Error('rejected');
      }
      throw SQLite3Adapter.wrapError('unknown error', error);
    }
  }

  /**
   * Connects to the database
   */
  public async connect(settings: IAdapterSettingsSQLite3) {
    try {
      this._client = await new Promise((resolve, reject) => {
        const client = new sqlite3.Database(settings.database, (error: any) => {
          if (error) {
            reject(error);
            return;
          }
          client.allAsync = util.promisify(client.all);
          client.runAsync = util.promisify(client.run);
          resolve(client);
        });
        return client;
      });
    } catch (error) {
      throw SQLite3Adapter.wrapError('failed to open', error);
    }
    await this._client.runAsync('PRAGMA foreign_keys=ON');
  }

  public close() {
    if (this._client) {
      this._client.close();
    }
    this._client = null;
  }

  /**
   * Exposes sqlite3 module's run method
   */
  public run() {
    return this._client.run.apply(this._client, arguments);
  }

  /**
   * Exposes sqlite3 module's all method
   */
  public all() {
    return this._client.all.apply(this._client, arguments);
  }

  protected valueToModel(value: any, property: any) {
    if (property.type_class === types.Object || property.array) {
      try {
        return JSON.parse(value);
      } catch (error1) {
        return null;
      }
    } else if (property.type_class === types.Date) {
      return new Date(value);
    } else if (property.type_class === types.Boolean) {
      return value !== 0;
    } else {
      return value;
    }
  }

  protected _getModelID(data: any) {
    return Number(data.id);
  }

  private async _getTables() {
    const query = `SELECT name FROM sqlite_master
      WHERE type='table' and name!='sqlite_sequence'`;
    let tables = await this._client.allAsync(query);
    tables = tables.map((table: any) => table.name);
    return tables;
  }

  private async _getSchema(table: string): Promise<any> {
    const columns = (await this._client.allAsync(`PRAGMA table_info(\`${table}\`)`));
    const schema: any = {};
    for (const column of columns) {
      const type = /^varchar\((\d*)\)/i.test(column.type) ? new types.String(Number(RegExp.$1))
        : /^double/i.test(column.type) ? new types.Number()
          : /^tinyint/i.test(column.type) ? new types.Boolean()
            : /^int/i.test(column.type) ? new types.Integer()
              : /^real/i.test(column.type) ? new types.Date()
                : /^text/i.test(column.type) ? new types.Object() : undefined;
      schema[column.name] = {
        required: column.notnull === 1,
        type,
      };
    }
    return schema;
  }

  private async _getIndexes(table: string): Promise<any> {
    const rows = await this._client.allAsync(`PRAGMA index_list(\`${table}\`)`);
    const indexes: any = {};
    for (const row of rows) {
      if (!indexes[row.name]) {
        indexes[row.name] = {};
      }
      const columns = await this._client.allAsync(`PRAGMA index_info(\`${row.name}\`)`);
      for (const column of columns) {
        indexes[row.name][column.name] = 1;
      }
    }
    return indexes;
  }

  private _buildUpdateSetOfColumn(property: any, data: any, values: any, fields: any[], places: any[], insert?: any) {
    const dbname = property._dbname;
    const value = data[dbname];
    if (value && value.$inc != null) {
      values.push(value.$inc);
      return fields.push(`"${dbname}"="${dbname}"+?`);
    } else {
      if (property.type_class === types.Date) {
        values.push(value != null ? value.getTime() : void 0);
      } else {
        values.push(value);
      }
      if (insert) {
        fields.push(`"${dbname}"`);
        return places.push('?');
      } else {
        return fields.push(`"${dbname}"=?`);
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
    const table_name = this._connection.models[model].table_name;
    const params: any[] = [];
    let sql = `SELECT ${select} FROM "${table_name}"`;
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, params);
    }
    if (options.group_by) {
      sql += ' GROUP BY ' + options.group_by.join(',');
    }
    if (options.conditions_of_group.length > 0) {
      sql += ' HAVING ' + this._buildWhere(options.group_fields, options.conditions_of_group, params);
    }
    if (options && options.orders.length > 0) {
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
      sql += ' ORDER BY ' + orders.join(',');
    }
    if ((options != null ? options.limit : void 0) != null) {
      sql += ' LIMIT ' + options.limit;
      if ((options != null ? options.skip : void 0) != null) {
        sql += ' OFFSET ' + options.skip;
      }
    } else if ((options != null ? options.skip : void 0) != null) {
      sql += ' LIMIT 2147483647 OFFSET ' + options.skip;
    }
    return [sql, params];
  }
}

export default (connection: any) => {
  return new SQLite3Adapter(connection);
};
