var sqlite3;

try {
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
import { SQLAdapterBase } from './sql_base';

function _typeToSQL(property) {
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

function _propertyToSQL(property) {
  var type;
  type = _typeToSQL(property);
  if (type) {
    if (property.required) {
      type += ' NOT NULL';
    } else {
      type += ' NULL';
    }
    return type;
  }
}

function _processSaveError(error) {
  if (/no such table/.test(error.message)) {
    return new Error('table does not exist');
  } else if (error.code === 'SQLITE_CONSTRAINT') {
    return new Error('duplicated');
  } else {
    return SQLite3Adapter.wrapError('unknown error', error);
  }
}

//#
// Adapter for SQLite3
// @namespace adapter
class SQLite3Adapter extends SQLAdapterBase {
  key_type = types.Integer;

  native_integrity = true;

  _regexp_op = null;

  _false_value = '0';

  //#
  // Creates a SQLite3 adapter
  constructor(connection) {
    super();
    this._connection = connection;
  }

  async _getTables() {
    var tables;
    tables = (await this._client.allAsync("SELECT name FROM sqlite_master WHERE type='table'"));
    tables = tables.map(function(table) {
      return table.name;
    });
    return tables;
  }

  async _getSchema(table) {
    var column, columns, j, len, schema, type;
    columns = (await this._client.allAsync(`PRAGMA table_info(\`${table}\`)`));
    schema = {};
    for (j = 0, len = columns.length; j < len; j++) {
      column = columns[j];
      type = /^varchar\((\d*)\)/i.test(column.type) ? new types.String(RegExp.$1) : /^double/i.test(column.type) ? new types.Number() : /^tinyint/i.test(column.type) ? new types.Boolean() : /^int/i.test(column.type) ? new types.Integer() : /^real/i.test(column.type) ? new types.Date() : /^text/i.test(column.type) ? new types.Object() : void 0;
      schema[column.name] = {
        type: type,
        required: column.notnull === 1
      };
    }
    return schema;
  }

  async _getIndexes(table) {
    var column, columns, indexes, j, k, len, len1, name, row, rows;
    rows = (await this._client.allAsync(`PRAGMA index_list(\`${table}\`)`));
    indexes = {};
    for (j = 0, len = rows.length; j < len; j++) {
      row = rows[j];
      indexes[name = row.name] || (indexes[name] = {});
      columns = (await this._client.allAsync(`PRAGMA index_info(\`${row.name}\`)`));
      for (k = 0, len1 = columns.length; k < len1; k++) {
        column = columns[k];
        indexes[row.name][column.name] = 1;
      }
    }
    return indexes;
  }

  //# @override AdapterBase::getSchemas
  async getSchemas() {
    var all_indexes, j, len, table, table_schemas, tables;
    tables = (await this._getTables());
    table_schemas = {};
    all_indexes = {};
    for (j = 0, len = tables.length; j < len; j++) {
      table = tables[j];
      table_schemas[table] = (await this._getSchema(table));
      all_indexes[table] = (await this._getIndexes(table));
    }
    return {
      tables: table_schemas,
      indexes: all_indexes
    };
  }

  //# @override AdapterBase::createTable
  async createTable(model) {
    var column, column_sql, error, integrity, j, len, model_class, property, ref, ref1, sql, tableName;
    model_class = this._connection.models[model];
    tableName = model_class.tableName;
    sql = [];
    sql.push('id INTEGER PRIMARY KEY AUTOINCREMENT');
    ref = model_class._schema;
    for (column in ref) {
      property = ref[column];
      column_sql = _propertyToSQL(property);
      if (column_sql) {
        sql.push(`"${property._dbname}" ${column_sql}`);
      }
    }
    ref1 = model_class._integrities;
    for (j = 0, len = ref1.length; j < len; j++) {
      integrity = ref1[j];
      if (integrity.type === 'child_nullify') {
        sql.push(`FOREIGN KEY ("${integrity.column}") REFERENCES "${integrity.parent.tableName}"(id) ON DELETE SET NULL`);
      } else if (integrity.type === 'child_restrict') {
        sql.push(`FOREIGN KEY ("${integrity.column}") REFERENCES "${integrity.parent.tableName}"(id) ON DELETE RESTRICT`);
      } else if (integrity.type === 'child_delete') {
        sql.push(`FOREIGN KEY ("${integrity.column}") REFERENCES "${integrity.parent.tableName}"(id) ON DELETE CASCADE`);
      }
    }
    sql = `CREATE TABLE "${tableName}" ( ${sql.join(',')} )`;
    try {
      await this._client.runAsync(sql);
    } catch (error1) {
      error = error1;
      throw SQLite3Adapter.wrapError('unknown error', error);
    }
  }

  //# @override AdapterBase::addColumn
  async addColumn(model, column_property) {
    var error, model_class, sql, tableName;
    model_class = this._connection.models[model];
    tableName = model_class.tableName;
    sql = `ALTER TABLE "${tableName}" ADD COLUMN "${column_property._dbname}" ${_propertyToSQL(column_property)}`;
    try {
      await this._client.runAsync(sql);
    } catch (error1) {
      error = error1;
      throw SQLite3Adapter.wrapError('unknown error', error);
    }
  }

  //# @override AdapterBase::createIndex
  async createIndex(model, index) {
    var column, columns, error, model_class, order, ref, sql, tableName, unique;
    model_class = this._connection.models[model];
    tableName = model_class.tableName;
    columns = [];
    ref = index.columns;
    for (column in ref) {
      order = ref[column];
      columns.push(`"${column}" ${(order === -1 ? 'DESC' : 'ASC')}`);
    }
    unique = index.options.unique ? 'UNIQUE ' : '';
    sql = `CREATE ${unique}INDEX "${index.options.name}" ON "${tableName}" (${columns.join(',')})`;
    try {
      await this._client.runAsync(sql);
    } catch (error1) {
      error = error1;
      throw SQLite3Adapter.wrapError('unknown error', error);
    }
  }

  //# @override AdapterBase::drop
  async drop(model) {
    var error, tableName;
    tableName = this._connection.models[model].tableName;
    try {
      await this._client.runAsync(`DROP TABLE IF EXISTS "${tableName}"`);
    } catch (error1) {
      error = error1;
      throw SQLite3Adapter.wrapError('unknown error', error);
    }
  }

  _getModelID(data) {
    return Number(data.id);
  }

  valueToModel(value, property) {
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

  _buildUpdateSetOfColumn(property, data, values, fields, places, insert) {
    var dbname, value;
    dbname = property._dbname;
    value = data[dbname];
    if ((value != null ? value.$inc : void 0) != null) {
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

  _buildUpdateSet(model, data, values, insert) {
    var column, fields, places, property, schema;
    schema = this._connection.models[model]._schema;
    fields = [];
    places = [];
    for (column in schema) {
      property = schema[column];
      this._buildUpdateSetOfColumn(property, data, values, fields, places, insert);
    }
    return [fields.join(','), places.join(',')];
  }

  _buildPartialUpdateSet(model, data, values) {
    var column, fields, places, property, schema, value;
    schema = this._connection.models[model]._schema;
    fields = [];
    places = [];
    for (column in data) {
      value = data[column];
      property = _.find(schema, function(item) {
        return item._dbname === column;
      });
      this._buildUpdateSetOfColumn(property, data, values, fields, places);
    }
    return [fields.join(','), places.join(',')];
  }

  //# @override AdapterBase::create
  async create(model, data) {
    var error, fields, id, places, sql, tableName, values;
    tableName = this._connection.models[model].tableName;
    values = [];
    [fields, places] = this._buildUpdateSet(model, data, values, true);
    sql = `INSERT INTO "${tableName}" (${fields}) VALUES (${places})`;
    try {
      id = (await new Promise((resolve, reject) => {
        return this._client.run(sql, values, function(error) {
          if (error) {
            return reject(error);
          } else {
            return resolve(this.lastID);
          }
        });
      }));
    } catch (error1) {
      error = error1;
      throw _processSaveError(error);
    }
    return id;
  }

  //# @override AdapterBase::createBulk
  async createBulk(model, data) {
    var error, fields, id, places, sql, tableName, values;
    tableName = this._connection.models[model].tableName;
    values = [];
    fields = void 0;
    places = [];
    data.forEach((item) => {
      var places_sub;
      [fields, places_sub] = this._buildUpdateSet(model, item, values, true);
      return places.push('(' + places_sub + ')');
    });
    sql = `INSERT INTO "${tableName}" (${fields}) VALUES ${places.join(',')}`;
    try {
      id = (await new Promise((resolve, reject) => {
        return this._client.run(sql, values, function(error) {
          if (error) {
            return reject(error);
          } else {
            return resolve(this.lastID);
          }
        });
      }));
    } catch (error1) {
      error = error1;
      throw _processSaveError(error);
    }
    if (id) {
      id = id - data.length + 1;
      return data.map(function(item, i) {
        return id + i;
      });
    } else {
      throw new Error('unexpected result');
    }
  }

  //# @override AdapterBase::update
  async update(model, data) {
    var error, fields, sql, tableName, values;
    tableName = this._connection.models[model].tableName;
    values = [];
    [fields] = this._buildUpdateSet(model, data, values);
    values.push(data.id);
    sql = `UPDATE "${tableName}" SET ${fields} WHERE id=?`;
    try {
      await this._client.runAsync(sql, values);
    } catch (error1) {
      error = error1;
      throw _processSaveError(error);
    }
  }

  //# @override AdapterBase::updatePartial
  async updatePartial(model, data, conditions, options) {
    var error, fields, sql, tableName, values;
    tableName = this._connection.models[model].tableName;
    values = [];
    [fields] = this._buildPartialUpdateSet(model, data, values);
    sql = `UPDATE "${tableName}" SET ${fields}`;
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, values);
    }
    try {
      return (await new Promise((resolve, reject) => {
        return this._client.run(sql, values, function(error) {
          if (error) {
            return reject(error);
          } else {
            return resolve(this.changes);
          }
        });
      }));
    } catch (error1) {
      error = error1;
      throw _processSaveError(error);
    }
  }

  //# @override AdapterBase::findById
  async findById(model, id, options) {
    var error, result, select, sql, tableName;
    select = this._buildSelect(this._connection.models[model], options.select);
    tableName = this._connection.models[model].tableName;
    sql = `SELECT ${select} FROM "${tableName}" WHERE id=? LIMIT 1`;
    if (options.explain) {
      return (await this._client.allAsync(`EXPLAIN QUERY PLAN ${sql}`, id));
    }
    try {
      result = (await this._client.allAsync(sql, id));
    } catch (error1) {
      error = error1;
      throw SQLite3Adapter.wrapError('unknown error', error);
    }
    if ((result != null ? result.length : void 0) === 1) {
      return this._convertToModelInstance(model, result[0], options);
    } else if ((result != null ? result.length : void 0) > 1) {
      throw new Error('unknown error');
    } else {
      throw new Error('not found');
    }
  }

  _buildSqlForFind(model, conditions, options) {
    var model_class, orders, params, schema, select, sql, tableName;
    if (options.group_by || options.group_fields) {
      select = this._buildGroupFields(options.group_by, options.group_fields);
    } else {
      select = this._buildSelect(this._connection.models[model], options.select);
    }
    tableName = this._connection.models[model].tableName;
    params = [];
    sql = `SELECT ${select} FROM "${tableName}"`;
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, params);
    }
    if (options.group_by) {
      sql += ' GROUP BY ' + options.group_by.join(',');
    }
    if (options.conditions_of_group.length > 0) {
      sql += ' HAVING ' + this._buildWhere(options.group_fields, options.conditions_of_group, params);
    }
    if ((options != null ? options.orders.length : void 0) > 0) {
      model_class = this._connection.models[model];
      schema = model_class._schema;
      orders = options.orders.map(function(order) {
        var column, ref;
        if (order[0] === '-') {
          column = order.slice(1);
          order = 'DESC';
        } else {
          column = order;
          order = 'ASC';
        }
        column = ((ref = schema[column]) != null ? ref._dbname : void 0) || column;
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
    //console.log sql, params
    return [sql, params];
  }

  //# @override AdapterBase::find
  async find(model, conditions, options) {
    var error, params, result, sql;
    [sql, params] = this._buildSqlForFind(model, conditions, options);
    if (options.explain) {
      return (await this._client.allAsync(`EXPLAIN QUERY PLAN ${sql}`, params));
    }
    try {
      result = (await this._client.allAsync(sql, params));
    } catch (error1) {
      error = error1;
      throw SQLite3Adapter.wrapError('unknown error', error);
    }
    if (options.group_fields) {
      return result.map((record) => {
        return this._convertToGroupInstance(model, record, options.group_by, options.group_fields);
      });
    } else {
      return result.map((record) => {
        return this._convertToModelInstance(model, record, options);
      });
    }
  }

  //# @override AdapterBase::stream
  stream(model, conditions, options) {
    var params, readable, sql;
    try {
      [sql, params] = this._buildSqlForFind(model, conditions, options);
    } catch (error1) {
      e = error1;
      readable = new stream.Readable({
        objectMode: true
      });
      readable._read = function() {
        return readable.emit('error', e);
      };
      return readable;
    }
    readable = new stream.Readable({
      objectMode: true
    });
    readable._read = function() { };
    this._client.each(sql, params, (error, record) => {
      if (error) {
        return readable.emit('error', error);
      }
      return readable.push(this._convertToModelInstance(model, record, options));
    }, function() {
      return readable.push(null);
    });
    return readable;
  }

  //# @override AdapterBase::count
  async count(model, conditions, options) {
    var error, params, result, sql, tableName;
    params = [];
    tableName = this._connection.models[model].tableName;
    sql = `SELECT COUNT(*) AS count FROM "${tableName}"`;
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
    try {
      //console.log sql, params
      result = (await this._client.allAsync(sql, params));
    } catch (error1) {
      error = error1;
      throw SQLite3Adapter.wrapError('unknown error', error);
    }
    if ((result != null ? result.length : void 0) !== 1) {
      throw new Error('unknown error');
    }
    return Number(result[0].count);
  }

  //# @override AdapterBase::delete
  async delete(model, conditions) {
    var error, params, sql, tableName;
    params = [];
    tableName = this._connection.models[model].tableName;
    sql = `DELETE FROM "${tableName}"`;
    if (conditions.length > 0) {
      sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, params);
    }
    try {
      //console.log sql, params
      return (await new Promise((resolve, reject) => {
        return this._client.run(sql, params, function(error) {
          if (error) {
            return reject(error);
          } else {
            return resolve(this.changes);
          }
        });
      }));
    } catch (error1) {
      error = error1;
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
      this._client = (await new Promise((resolve, reject) => {
        var client;
        return client = new sqlite3.Database(settings.database, (error) => {
          if (error) {
            reject(error);
            return;
          }
          client.allAsync = util.promisify(client.all);
          client.runAsync = util.promisify(client.run);
          return resolve(client);
        });
      }));
    } catch (error) {
      throw SQLite3Adapter.wrapError('failed to open', error);
    }
    await this._client.runAsync('PRAGMA foreign_keys=ON');
  }

  public close() {
    if (this._client) {
      this._client.close();
    }
    return this._client = null;
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
}

export default (connection) => {
  return new SQLite3Adapter(connection);
};
