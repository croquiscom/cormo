"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
let sqlite3;
try {
    // tslint:disable-next-line:no-var-requires
    sqlite3 = require('sqlite3');
}
catch (error) {
    console.log('Install sqlite3 module to use this adapter');
    process.exit(1);
}
const _ = require("lodash");
const stream = require("stream");
const util = require("util");
const types = require("../types");
const sql_base_1 = require("./sql_base");
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
        return SQLite3Adapter.wrapError('unknown error', error);
    }
}
// Adapter for SQLite3
// @namespace adapter
class SQLite3Adapter extends sql_base_1.SQLAdapterBase {
    // Creates a SQLite3 adapter
    constructor(connection) {
        super();
        this.key_type = types.Integer;
        this.native_integrity = true;
        this._regexp_op = null;
        this._false_value = '0';
        this._connection = connection;
    }
    getSchemas() {
        return __awaiter(this, void 0, void 0, function* () {
            const tables = yield this._getTables();
            const table_schemas = {};
            const all_indexes = {};
            for (const table of tables) {
                table_schemas[table] = yield this._getSchema(table);
                all_indexes[table] = yield this._getIndexes(table);
            }
            return {
                indexes: all_indexes,
                tables: table_schemas,
            };
        });
    }
    createTable(model) {
        return __awaiter(this, void 0, void 0, function* () {
            const model_class = this._connection.models[model];
            const tableName = model_class.tableName;
            const column_sqls = [];
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
                const parentTableName = integrity.parent && integrity.parent.tableName || '';
                if (integrity.type === 'child_nullify') {
                    column_sqls.push(`FOREIGN KEY ("${integrity.column}") REFERENCES "${parentTableName}"(id) ON DELETE SET NULL`);
                }
                else if (integrity.type === 'child_restrict') {
                    column_sqls.push(`FOREIGN KEY ("${integrity.column}") REFERENCES "${parentTableName}"(id) ON DELETE RESTRICT`);
                }
                else if (integrity.type === 'child_delete') {
                    column_sqls.push(`FOREIGN KEY ("${integrity.column}") REFERENCES "${parentTableName}"(id) ON DELETE CASCADE`);
                }
            }
            const sql = `CREATE TABLE "${tableName}" ( ${column_sqls.join(',')} )`;
            try {
                yield this._client.runAsync(sql);
            }
            catch (error) {
                throw SQLite3Adapter.wrapError('unknown error', error);
            }
        });
    }
    addColumn(model, column_property) {
        return __awaiter(this, void 0, void 0, function* () {
            const model_class = this._connection.models[model];
            const tableName = model_class.tableName;
            const sql = `ALTER TABLE "${tableName}" ADD COLUMN "${column_property._dbname}" ${_propertyToSQL(column_property)}`;
            try {
                yield this._client.runAsync(sql);
            }
            catch (error) {
                throw SQLite3Adapter.wrapError('unknown error', error);
            }
        });
    }
    createIndex(model, index) {
        return __awaiter(this, void 0, void 0, function* () {
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
                yield this._client.runAsync(sql);
            }
            catch (error) {
                throw SQLite3Adapter.wrapError('unknown error', error);
            }
        });
    }
    drop(model) {
        return __awaiter(this, void 0, void 0, function* () {
            const tableName = this._connection.models[model].tableName;
            try {
                yield this._client.runAsync(`DROP TABLE IF EXISTS "${tableName}"`);
            }
            catch (error) {
                throw SQLite3Adapter.wrapError('unknown error', error);
            }
        });
    }
    create(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const tableName = this._connection.models[model].tableName;
            const values = [];
            const [fields, places] = this._buildUpdateSet(model, data, values, true);
            const sql = `INSERT INTO "${tableName}" (${fields}) VALUES (${places})`;
            let id;
            try {
                id = yield new Promise((resolve, reject) => {
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
            return id;
        });
    }
    createBulk(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const tableName = this._connection.models[model].tableName;
            const values = [];
            let fields;
            const places = [];
            data.forEach((item) => {
                let places_sub;
                [fields, places_sub] = this._buildUpdateSet(model, item, values, true);
                return places.push('(' + places_sub + ')');
            });
            const sql = `INSERT INTO "${tableName}" (${fields}) VALUES ${places.join(',')}`;
            let id;
            try {
                id = yield new Promise((resolve, reject) => {
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
        });
    }
    update(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const tableName = this._connection.models[model].tableName;
            const values = [];
            const [fields] = this._buildUpdateSet(model, data, values);
            values.push(data.id);
            const sql = `UPDATE "${tableName}" SET ${fields} WHERE id=?`;
            try {
                yield this._client.runAsync(sql, values);
            }
            catch (error) {
                throw _processSaveError(error);
            }
        });
    }
    updatePartial(model, data, conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const tableName = this._connection.models[model].tableName;
            const values = [];
            const [fields] = this._buildPartialUpdateSet(model, data, values);
            let sql = `UPDATE "${tableName}" SET ${fields}`;
            if (conditions.length > 0) {
                sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, values);
            }
            try {
                return yield new Promise((resolve, reject) => {
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
        });
    }
    findById(model, id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const select = this._buildSelect(this._connection.models[model], options.select);
            const tableName = this._connection.models[model].tableName;
            const sql = `SELECT ${select} FROM "${tableName}" WHERE id=? LIMIT 1`;
            if (options.explain) {
                return yield this._client.allAsync(`EXPLAIN QUERY PLAN ${sql}`, id);
            }
            let result;
            try {
                result = (yield this._client.allAsync(sql, id));
            }
            catch (error) {
                throw SQLite3Adapter.wrapError('unknown error', error);
            }
            if (result && result.length === 1) {
                return this._convertToModelInstance(model, result[0], options);
            }
            else if (result && result.length > 1) {
                throw new Error('unknown error');
            }
            else {
                throw new Error('not found');
            }
        });
    }
    find(model, conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const [sql, params] = this._buildSqlForFind(model, conditions, options);
            if (options.explain) {
                return yield this._client.allAsync(`EXPLAIN QUERY PLAN ${sql}`, params);
            }
            let result;
            try {
                result = (yield this._client.allAsync(sql, params));
            }
            catch (error) {
                throw SQLite3Adapter.wrapError('unknown error', error);
            }
            if (options.group_fields) {
                return result.map((record) => {
                    return this._convertToGroupInstance(model, record, options.group_by, options.group_fields);
                });
            }
            else {
                return result.map((record) => {
                    return this._convertToModelInstance(model, record, options);
                });
            }
        });
    }
    stream(model, conditions, options) {
        let sql;
        let params;
        try {
            [sql, params] = this._buildSqlForFind(model, conditions, options);
        }
        catch (error) {
            const r = new stream.Readable({ objectMode: true });
            r._read = () => r.emit('error', error);
            return r;
        }
        const readable = new stream.Readable({ objectMode: true });
        readable._read = () => { };
        this._client.each(sql, params, (error, record) => {
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
    count(model, conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = [];
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
                sql = `SELECT COUNT(*) AS count FROM (${sql})`;
            }
            let result;
            try {
                result = yield this._client.allAsync(sql, params);
            }
            catch (error) {
                throw SQLite3Adapter.wrapError('unknown error', error);
            }
            if (result && result.length !== 1) {
                throw new Error('unknown error');
            }
            return Number(result[0].count);
        });
    }
    delete(model, conditions) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = [];
            const tableName = this._connection.models[model].tableName;
            let sql = `DELETE FROM "${tableName}"`;
            if (conditions.length > 0) {
                sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, params);
            }
            try {
                return yield new Promise((resolve, reject) => {
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
        });
    }
    /**
     * Connects to the database
     */
    connect(settings) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this._client = yield new Promise((resolve, reject) => {
                    const client = new sqlite3.Database(settings.database, (error) => {
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
            }
            catch (error) {
                throw SQLite3Adapter.wrapError('failed to open', error);
            }
            yield this._client.runAsync('PRAGMA foreign_keys=ON');
        });
    }
    close() {
        if (this._client) {
            this._client.close();
        }
        this._client = null;
    }
    /**
     * Exposes sqlite3 module's run method
     */
    run() {
        return this._client.run.apply(this._client, arguments);
    }
    /**
     * Exposes sqlite3 module's all method
     */
    all() {
        return this._client.all.apply(this._client, arguments);
    }
    valueToModel(value, property) {
        if (property.type_class === types.Object || property.array) {
            try {
                return JSON.parse(value);
            }
            catch (error1) {
                return null;
            }
        }
        else if (property.type_class === types.Date) {
            return new Date(value);
        }
        else if (property.type_class === types.Boolean) {
            return value !== 0;
        }
        else {
            return value;
        }
    }
    _getModelID(data) {
        return Number(data.id);
    }
    _getTables() {
        return __awaiter(this, void 0, void 0, function* () {
            let tables = yield this._client.allAsync("SELECT name FROM sqlite_master WHERE type='table'");
            tables = tables.map((table) => table.name);
            return tables;
        });
    }
    _getSchema(table) {
        return __awaiter(this, void 0, void 0, function* () {
            const columns = (yield this._client.allAsync(`PRAGMA table_info(\`${table}\`)`));
            const schema = {};
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
        });
    }
    _getIndexes(table) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield this._client.allAsync(`PRAGMA index_list(\`${table}\`)`);
            const indexes = {};
            for (const row of rows) {
                if (!indexes[row.name]) {
                    indexes[row.name] = {};
                }
                const columns = yield this._client.allAsync(`PRAGMA index_info(\`${row.name}\`)`);
                for (const column of columns) {
                    indexes[row.name][column.name] = 1;
                }
            }
            return indexes;
        });
    }
    _buildUpdateSetOfColumn(property, data, values, fields, places, insert) {
        const dbname = property._dbname;
        const value = data[dbname];
        if (value && value.$inc != null) {
            values.push(value.$inc);
            return fields.push(`"${dbname}"="${dbname}"+?`);
        }
        else {
            if (property.type_class === types.Date) {
                values.push(value != null ? value.getTime() : void 0);
            }
            else {
                values.push(value);
            }
            if (insert) {
                fields.push(`"${dbname}"`);
                return places.push('?');
            }
            else {
                return fields.push(`"${dbname}"=?`);
            }
        }
    }
    _buildUpdateSet(model, data, values, insert) {
        const schema = this._connection.models[model]._schema;
        const fields = [];
        const places = [];
        // tslint:disable-next-line:forin
        for (const column in schema) {
            const property = schema[column];
            this._buildUpdateSetOfColumn(property, data, values, fields, places, insert);
        }
        return [fields.join(','), places.join(',')];
    }
    _buildPartialUpdateSet(model, data, values) {
        const schema = this._connection.models[model]._schema;
        const fields = [];
        const places = [];
        // tslint:disable-next-line:forin
        for (const column in data) {
            const value = data[column];
            const property = _.find(schema, (item) => item._dbname === column);
            this._buildUpdateSetOfColumn(property, data, values, fields, places);
        }
        return [fields.join(','), places.join(',')];
    }
    _buildSqlForFind(model, conditions, options) {
        let select;
        if (options.group_by || options.group_fields) {
            select = this._buildGroupFields(options.group_by, options.group_fields);
        }
        else {
            select = this._buildSelect(this._connection.models[model], options.select);
        }
        const tableName = this._connection.models[model].tableName;
        const params = [];
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
        if (options && options.orders.length > 0) {
            const model_class = this._connection.models[model];
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
        }
        else if ((options != null ? options.skip : void 0) != null) {
            sql += ' LIMIT 2147483647 OFFSET ' + options.skip;
        }
        return [sql, params];
    }
}
exports.default = (connection) => {
    return new SQLite3Adapter(connection);
};
