import stream from 'stream';
import util from 'util';
import _ from 'lodash';
import * as types from '../types.js';
import { AdapterBase, } from './base.js';
import { SQLAdapterBase } from './sql_base.js';
let sqlite3;
const module_promise = import('sqlite3')
    .then((m) => {
    sqlite3 = m.default;
})
    .catch(() => {
    //
});
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
            return 'INTEGER';
        case types.BigInteger:
            return 'BIGINT';
        case types.Date:
            return 'REAL';
        case types.Object:
            return 'TEXT';
        case types.Text:
            return 'TEXT';
        case types.Blob:
            return 'BLOB';
    }
}
function _propertyToSQL(property) {
    let type = _typeToSQL(property);
    if (type) {
        if (property.required) {
            type += ' NOT NULL';
        }
        else {
            type += ' NULL';
        }
        return type;
    }
}
function _processSaveError(error) {
    if (/no such table/.test(error.message)) {
        return new Error('table does not exist');
    }
    else if (error.code === 'SQLITE_CONSTRAINT') {
        return new Error('duplicated');
    }
    else {
        return AdapterBase.wrapError('unknown error', error);
    }
}
// Adapter for SQLite3
// @namespace adapter
export class SQLite3Adapter extends SQLAdapterBase {
    // Creates a SQLite3 adapter
    /** @internal */
    constructor(connection) {
        super();
        /** @internal */
        this.support_join = true;
        /** @internal */
        this.support_distinct = true;
        /** @internal */
        this.key_type = types.Integer;
        /** @internal */
        this.native_integrity = true;
        /** @internal */
        this._contains_escape_op = " ESCAPE '\\'";
        /** @internal */
        this._regexp_op = null;
        /** @internal */
        this._false_value = '0';
        this._connection = connection;
    }
    /** @internal */
    async getSchemas() {
        const tables = await this._getTables();
        const table_schemas = {};
        const all_indexes = {};
        const all_foreign_keys = {};
        for (const table of tables) {
            table_schemas[table] = await this._getSchema(table);
            all_indexes[table] = await this._getIndexes(table);
            all_foreign_keys[table] = await this._getForeignKeys(table);
        }
        return {
            foreign_keys: all_foreign_keys,
            indexes: all_indexes,
            tables: table_schemas,
        };
    }
    /** @internal */
    async createTable(model_name) {
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
                column_sqls.push(`"${property._dbname_us}" INTEGER PRIMARY KEY AUTOINCREMENT`);
            }
            else {
                const column_sql = _propertyToSQL(property);
                if (column_sql) {
                    column_sqls.push(`"${property._dbname_us}" ${column_sql}`);
                }
            }
        }
        for (const integrity of model_class._integrities) {
            const parenttable_name = (integrity.parent && integrity.parent.table_name) || '';
            if (integrity.type === 'child_nullify') {
                column_sqls.push(`FOREIGN KEY ("${integrity.column}") REFERENCES "${parenttable_name}"(id) ON DELETE SET NULL`);
            }
            else if (integrity.type === 'child_restrict') {
                column_sqls.push(`FOREIGN KEY ("${integrity.column}") REFERENCES "${parenttable_name}"(id) ON DELETE RESTRICT`);
            }
            else if (integrity.type === 'child_delete') {
                column_sqls.push(`FOREIGN KEY ("${integrity.column}") REFERENCES "${parenttable_name}"(id) ON DELETE CASCADE`);
            }
        }
        const sql = `CREATE TABLE "${table_name}" ( ${column_sqls.join(',')} )`;
        try {
            await this._client.runAsync(sql);
        }
        catch (error) {
            throw SQLite3Adapter.wrapError('unknown error', error);
        }
    }
    /** @internal */
    async addColumn(model_name, column_property) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return;
        }
        const table_name = model_class.table_name;
        const column_name = column_property._dbname_us;
        const sql = `ALTER TABLE "${table_name}" ADD COLUMN "${column_name}" ${_propertyToSQL(column_property)}`;
        try {
            await this._client.runAsync(sql);
        }
        catch (error) {
            throw SQLite3Adapter.wrapError('unknown error', error);
        }
    }
    /** @internal */
    async createIndex(model_name, index) {
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
            await this._client.runAsync(sql);
        }
        catch (error) {
            throw SQLite3Adapter.wrapError('unknown error', error);
        }
    }
    /** @internal */
    async deleteAllIgnoringConstraint(model_list) {
        await this._client.runAsync('PRAGMA foreign_keys=OFF');
        await Promise.all(model_list.map(async (model_name) => {
            const model_class = this._connection.models[model_name];
            if (!model_class) {
                return;
            }
            const table_name = model_class.table_name;
            await this._client.runAsync(`DELETE FROM \`${table_name}\``);
        }));
        await this._client.runAsync('PRAGMA foreign_keys=ON');
    }
    /** @internal */
    async drop(model_name) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return;
        }
        const table_name = model_class.table_name;
        try {
            await this._client.runAsync(`DROP TABLE IF EXISTS "${table_name}"`);
        }
        catch (error) {
            throw SQLite3Adapter.wrapError('unknown error', error);
        }
    }
    /** @internal */
    getAdapterTypeString(column_property) {
        return _typeToSQL(column_property);
    }
    /** @internal */
    async create(model_name, data, options) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return;
        }
        const table_name = model_class.table_name;
        const values = [];
        const [fields, places] = this._buildUpdateSet(model_name, data, values, true, options.use_id_in_data);
        const sql = `INSERT INTO "${table_name}" (${fields}) VALUES (${places})`;
        let id;
        try {
            if (options.transaction) {
                options.transaction.checkFinished();
                id = await new Promise((resolve, reject) => {
                    options.transaction._adapter_connection.run(sql, values, function (error) {
                        if (error) {
                            reject(error);
                        }
                        else {
                            resolve(this.lastID);
                        }
                    });
                });
            }
            else {
                id = await new Promise((resolve, reject) => {
                    this._client.run(sql, values, function (error) {
                        if (error) {
                            reject(error);
                        }
                        else {
                            resolve(this.lastID);
                        }
                    });
                });
            }
        }
        catch (error) {
            throw _processSaveError(error);
        }
        return id;
    }
    /** @internal */
    async createBulk(model_name, data, options) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            throw new Error('model not found');
        }
        const table_name = model_class.table_name;
        const values = [];
        let fields;
        const places = [];
        data.forEach((item) => {
            let places_sub;
            [fields, places_sub] = this._buildUpdateSet(model_name, item, values, true, options.use_id_in_data);
            return places.push('(' + places_sub + ')');
        });
        const sql = `INSERT INTO "${table_name}" (${fields}) VALUES ${places.join(',')}`;
        let id;
        try {
            id = await new Promise((resolve, reject) => {
                this._client.run(sql, values, function (error) {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(this.lastID);
                    }
                });
            });
        }
        catch (error) {
            throw _processSaveError(error);
        }
        if (id) {
            id = id - data.length + 1;
            return data.map((item, i) => id + i);
        }
        else {
            throw new Error('unexpected result');
        }
    }
    /** @internal */
    async update(model_name, data, _options) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return;
        }
        const table_name = model_class.table_name;
        const values = [];
        const [fields] = this._buildUpdateSet(model_name, data, values);
        values.push(data.id);
        const sql = `UPDATE "${table_name}" SET ${fields} WHERE id=?`;
        try {
            await this._client.runAsync(sql, values);
        }
        catch (error) {
            throw _processSaveError(error);
        }
    }
    /** @internal */
    async updatePartial(model_name, data, conditions, _options) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return 0;
        }
        const table_name = model_class.table_name;
        const values = [];
        const [fields] = this._buildPartialUpdateSet(model_name, data, values);
        let sql = `UPDATE "${table_name}" SET ${fields}`;
        if (conditions.length > 0) {
            sql += ' WHERE ' + this._buildWhere(model_class._schema, '', {}, conditions, values);
        }
        try {
            return await new Promise((resolve, reject) => {
                this._client.run(sql, values, function (error) {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(this.changes);
                    }
                });
            });
        }
        catch (error) {
            throw _processSaveError(error);
        }
    }
    /** @internal */
    async findById(model_name, id, options) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            throw new Error('model not found');
        }
        const select = this._buildSelect(model_class, options.select);
        const table_name = model_class.table_name;
        const sql = `SELECT ${select} FROM "${table_name}" AS _Base WHERE id=? LIMIT 1`;
        if (options.explain) {
            return await this._client.allAsync(`EXPLAIN QUERY PLAN ${sql}`, id);
        }
        let result;
        try {
            result = await this._client.allAsync(sql, id);
        }
        catch (error) {
            throw SQLite3Adapter.wrapError('unknown error', error);
        }
        if (result && result.length === 1) {
            return this._convertToModelInstance(model_name, result[0], options);
        }
        else if (result && result.length > 1) {
            throw new Error('unknown error');
        }
        else {
            throw new Error('not found');
        }
    }
    /** @internal */
    async find(model_name, conditions, options) {
        const [sql, params] = this._buildSqlForFind(model_name, conditions, options);
        if (options.explain) {
            return await this._client.allAsync(`EXPLAIN QUERY PLAN ${sql}`, params);
        }
        let result;
        try {
            result = await this._client.allAsync(sql, params);
        }
        catch (error) {
            throw SQLite3Adapter.wrapError('unknown error', error);
        }
        if (options.group_fields) {
            const model_class = this._connection.models[model_name];
            return result.map((record) => {
                return this._convertToGroupInstance(model_name, record, options.group_by, options.group_fields, model_class?.query_record_id_as_string ?? false);
            });
        }
        else {
            return result.map((record) => {
                return this._convertToModelInstance(model_name, record, options);
            });
        }
    }
    /** @internal */
    stream(model_name, conditions, options) {
        let sql;
        let params;
        try {
            [sql, params] = this._buildSqlForFind(model_name, conditions, options);
        }
        catch (error) {
            const r = new stream.Readable({ objectMode: true });
            r._read = () => r.emit('error', error);
            return r;
        }
        const readable = new stream.Readable({ objectMode: true });
        readable._read = () => {
            /**/
        };
        this._client.each(sql, params, (error, record) => {
            if (error) {
                readable.emit('error', error);
                return;
            }
            readable.push(this._convertToModelInstance(model_name, record, options));
        }, () => {
            readable.push(null);
        });
        return readable;
    }
    /** @internal */
    async count(model_name, conditions, options) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return 0;
        }
        const select = options.select ? this._buildSelect(model_class, options.select) : '*';
        const params = [];
        const table_name = model_class.table_name;
        const join_schemas = {};
        let sql = options.distinct && !options.select
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
            sql = `SELECT COUNT(*) AS count FROM (${sql})`;
        }
        if (options.distinct && !options.select) {
            sql = `SELECT COUNT(*) AS count FROM (${sql}) _sub`;
        }
        let result;
        try {
            result = await this._client.allAsync(sql, params);
        }
        catch (error) {
            throw SQLite3Adapter.wrapError('unknown error', error);
        }
        if (result && result.length !== 1) {
            throw new Error('unknown error');
        }
        return Number(result[0].count);
    }
    /** @internal */
    async delete(model_name, conditions, options) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return 0;
        }
        const nested = options.orders.length > 0 || options.limit || options.skip;
        const params = [];
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
            const orders = options.orders.map((order) => {
                let column;
                if (order[0] === '-') {
                    column = order.slice(1);
                    order = 'DESC';
                }
                else {
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
        }
        else if (options.skip) {
            sql += ' LIMIT 2147483647 OFFSET ' + options.skip;
        }
        if (nested) {
            sql += ')';
        }
        try {
            return await new Promise((resolve, reject) => {
                this._client.run(sql, params, function (error) {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(this.changes);
                    }
                });
            });
        }
        catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT') {
                throw new Error('rejected');
            }
            throw SQLite3Adapter.wrapError('unknown error', error);
        }
    }
    /**
     * Connects to the database
     * @internal
     */
    async connect(settings) {
        await module_promise;
        if (!sqlite3) {
            console.log('Install sqlite3 module to use this adapter');
            process.exit(1);
        }
        try {
            this._settings = settings;
            this._client = await this._getClient();
        }
        catch (error) {
            throw SQLite3Adapter.wrapError('failed to open', error);
        }
        await this._client.runAsync('PRAGMA foreign_keys=ON');
    }
    /** @internal */
    close() {
        if (this._client) {
            this._client.close();
        }
        this._client = null;
    }
    /** @internal */
    async getConnection() {
        const adapter_connection = await this._getClient();
        return adapter_connection;
    }
    /** @internal */
    async releaseConnection(adapter_connection) {
        adapter_connection.close();
        return Promise.resolve();
    }
    /** @internal */
    async startTransaction(adapter_connection, _isolation_level) {
        await adapter_connection.allAsync('BEGIN TRANSACTION');
    }
    /** @internal */
    async commitTransaction(adapter_connection) {
        await adapter_connection.allAsync('COMMIT');
    }
    /** @internal */
    async rollbackTransaction(adapter_connection) {
        await adapter_connection.allAsync('ROLLBACK');
    }
    /**
     * Exposes sqlite3 module's run method
     */
    run(sql, ...params) {
        return this._client.run(sql, ...params);
    }
    /**
     * Exposes sqlite3 module's all method
     */
    all(sql, ...params) {
        return this._client.all(sql, ...params);
    }
    /** @internal */
    valueToModel(value, property, query_record_id_as_string) {
        if (property.type_class === types.Object || property.array) {
            try {
                const array = JSON.parse(value);
                if (property.record_id && query_record_id_as_string) {
                    return array.map((item) => (item ? String(item) : null));
                }
                return array;
            }
            catch {
                return null;
            }
        }
        else if (property.type_class === types.Date) {
            return new Date(value);
        }
        else if (property.type_class === types.Boolean) {
            return value !== 0;
        }
        else if (property.record_id && query_record_id_as_string) {
            return String(value);
        }
        else {
            return value;
        }
    }
    /** @internal */
    _getModelID(data) {
        if (!data.id) {
            return null;
        }
        return Number(data.id);
    }
    /** @internal */
    async _getClient() {
        return await new Promise((resolve, reject) => {
            const client = new sqlite3.Database(this._settings.database, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                client.allAsync = util.promisify(client.all);
                client.runAsync = util.promisify(client.run);
                resolve(client);
            });
        });
    }
    /** @internal */
    async _getTables() {
        const query = `SELECT name FROM sqlite_master
      WHERE type='table' and name!='sqlite_sequence'`;
        let tables = await this._client.allAsync(query);
        tables = tables.map((table) => table.name);
        return tables;
    }
    /** @internal */
    async _getSchema(table) {
        const columns = await this._client.allAsync(`PRAGMA table_info(\`${table}\`)`);
        const schema = { columns: {} };
        for (const column of columns) {
            const type = /^varchar\((\d*)\)/i.test(column.type)
                ? new types.String(Number(RegExp.$1))
                : /^double/i.test(column.type)
                    ? new types.Number()
                    : /^tinyint/i.test(column.type)
                        ? new types.Boolean()
                        : /^int/i.test(column.type)
                            ? new types.Integer()
                            : /^bigint/i.test(column.type)
                                ? new types.BigInteger()
                                : /^real/i.test(column.type)
                                    ? new types.Date()
                                    : /^text/i.test(column.type)
                                        ? new types.Text()
                                        : /^blob/i.test(column.type)
                                            ? new types.Blob()
                                            : undefined;
            schema.columns[column.name] = {
                required: column.notnull === 1,
                type,
                adapter_type_string: column.type.toUpperCase(),
            };
        }
        return schema;
    }
    /** @internal */
    async _getIndexes(table) {
        const rows = await this._client.allAsync(`PRAGMA index_list(\`${table}\`)`);
        const indexes = {};
        for (const row of rows) {
            let index = indexes[row.name];
            if (!index) {
                index = indexes[row.name] = {};
            }
            const columns = await this._client.allAsync(`PRAGMA index_info(\`${row.name}\`)`);
            for (const column of columns) {
                index[column.name] = 1;
            }
        }
        return indexes;
    }
    /** @internal */
    async _getForeignKeys(table) {
        const rows = await this._client.allAsync(`PRAGMA foreign_key_list(\`${table}\`)`);
        const foreign_keys = {};
        for (const row of rows) {
            foreign_keys[row.from] = row.table;
        }
        return foreign_keys;
    }
    /** @internal */
    _buildUpdateSetOfColumn(property, data, values, fields, places, insert = false) {
        const dbname = property._dbname_us;
        const value = data[dbname];
        if (value && value.$inc != null) {
            values.push(value.$inc);
            fields.push(`"${dbname}"="${dbname}"+?`);
        }
        else {
            if (property.type_class === types.Date) {
                values.push(value && value.getTime());
            }
            else {
                values.push(value);
            }
            if (insert) {
                fields.push(`"${dbname}"`);
                places.push('?');
            }
            else {
                fields.push(`"${dbname}"=?`);
            }
        }
    }
    /** @internal */
    _buildUpdateSet(model_name, data, values, insert = false, use_id_in_data) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return ['', ''];
        }
        const schema = model_class._schema;
        const fields = [];
        const places = [];
        for (const column in schema) {
            const property = schema[column];
            if (property?.primary_key) {
                continue;
            }
            this._buildUpdateSetOfColumn(property, data, values, fields, places, insert);
        }
        if (use_id_in_data && data.id) {
            fields.push('id');
            places.push('?');
            values.push(data.id);
        }
        return [fields.join(','), places.join(',')];
    }
    /** @internal */
    _buildPartialUpdateSet(model_name, data, values) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return ['', ''];
        }
        const schema = model_class._schema;
        const fields = [];
        const places = [];
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
    _buildSqlForFind(model_name, conditions, options) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return ['', []];
        }
        let select;
        if (options.group_by || options.group_fields) {
            select = this._buildGroupFields(model_class, options.group_by, options.group_fields);
        }
        else {
            select = this._buildSelect(model_class, options.select);
        }
        const params = [];
        const table_name = model_class.table_name;
        const join_schemas = {};
        let sql = `SELECT ${options.distinct ? 'DISTINCT' : ''} ${select} FROM "${table_name}" AS _Base`;
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
        if (options.orders.length > 0) {
            const schema = model_class._schema;
            const orders = options.orders.map((order) => {
                let column;
                if (order[0] === '-') {
                    column = order.slice(1);
                    order = 'DESC';
                }
                else {
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
        }
        else if (options.skip) {
            sql += ' LIMIT 2147483647 OFFSET ' + options.skip;
        }
        return [sql, params];
    }
}
export function createAdapter(connection) {
    return new SQLite3Adapter(connection);
}
