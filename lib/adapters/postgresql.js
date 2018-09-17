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
let pg;
// tslint:disable-next-line:variable-name
let QueryStream;
try {
    // tslint:disable-next-line:no-var-requires
    pg = require('pg');
}
catch (error) {
    console.log('Install pg module to use this adapter');
    process.exit(1);
}
try {
    // tslint:disable-next-line:no-var-requires
    QueryStream = require('pg-query-stream');
}
catch (error) { /**/ }
const _ = require("lodash");
const stream = require("stream");
const types = require("../types");
const sql_base_1 = require("./sql_base");
function _typeToSQL(property) {
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
function _processSaveError(tableName, error) {
    if (error.code === '42P01') {
        return new Error('table does not exist');
    }
    else if (error.code === '23505') {
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
    }
    else {
        return PostgreSQLAdapter.wrapError('unknown error', error);
    }
}
// Adapter for PostgreSQL
// @namespace adapter
class PostgreSQLAdapter extends sql_base_1.SQLAdapterBase {
    // Creates a PostgreSQL adapter
    constructor(connection) {
        super();
        this.key_type = types.Integer;
        this.support_geopoint = true;
        this.support_string_type_with_length = true;
        this.native_integrity = true;
        this._contains_op = 'ILIKE';
        this._regexp_op = '~*';
        this._connection = connection;
    }
    getSchemas() {
        return __awaiter(this, void 0, void 0, function* () {
            const tables = yield this._getTables();
            const table_schemas = {};
            for (const table of tables) {
                table_schemas[table] = yield this._getSchema(table);
            }
            const indexes = yield this._getIndexes();
            const foreign_keys = yield this._getForeignKeys();
            return {
                foreign_keys,
                indexes,
                tables: table_schemas,
            };
        });
    }
    createTable(model) {
        return __awaiter(this, void 0, void 0, function* () {
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
                yield this._pool.query(sql);
            }
            catch (error) {
                throw PostgreSQLAdapter.wrapError('unknown error', error);
            }
        });
    }
    addColumn(model, column_property) {
        return __awaiter(this, void 0, void 0, function* () {
            const model_class = this._connection.models[model];
            const tableName = model_class.tableName;
            const sql = `ALTER TABLE "${tableName}" ADD COLUMN "${column_property._dbname}" ${_propertyToSQL(column_property)}`;
            try {
                yield this._pool.query(sql);
            }
            catch (error) {
                throw PostgreSQLAdapter.wrapError('unknown error', error);
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
                yield this._pool.query(sql);
            }
            catch (error) {
                throw PostgreSQLAdapter.wrapError('unknown error', error);
            }
        });
    }
    createForeignKey(model, column, type, references) {
        return __awaiter(this, void 0, void 0, function* () {
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
                yield this._pool.query(sql);
            }
            catch (error) {
                throw PostgreSQLAdapter.wrapError('unknown error', error);
            }
        });
    }
    drop(model) {
        return __awaiter(this, void 0, void 0, function* () {
            const tableName = this._connection.models[model].tableName;
            try {
                yield this._pool.query(`DROP TABLE IF EXISTS "${tableName}"`);
            }
            catch (error) {
                throw PostgreSQLAdapter.wrapError('unknown error', error);
            }
        });
    }
    create(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const tableName = this._connection.models[model].tableName;
            const values = [];
            const [fields, places] = this._buildUpdateSet(model, data, values, true);
            const sql = `INSERT INTO "${tableName}" (${fields}) VALUES (${places}) RETURNING id`;
            let result;
            try {
                result = yield this._pool.query(sql, values);
            }
            catch (error) {
                throw _processSaveError(tableName, error);
            }
            const rows = result && result.rows;
            if (rows && rows.length === 1 && rows[0].id) {
                return rows[0].id;
            }
            else {
                throw new Error('unexpected rows');
            }
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
                places.push('(' + places_sub + ')');
            });
            const sql = `INSERT INTO "${tableName}" (${fields}) VALUES ${places.join(',')} RETURNING id`;
            let result;
            try {
                result = yield this._pool.query(sql, values);
            }
            catch (error) {
                throw _processSaveError(tableName, error);
            }
            const ids = result && result.rows.map((row) => row.id);
            if (ids && ids.length === data.length) {
                return ids;
            }
            else {
                throw new Error('unexpected rows');
            }
        });
    }
    update(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const tableName = this._connection.models[model].tableName;
            const values = [];
            const [fields] = this._buildUpdateSet(model, data, values);
            values.push(data.id);
            const sql = `UPDATE "${tableName}" SET ${fields} WHERE id=$${values.length}`;
            try {
                yield this._pool.query(sql, values);
            }
            catch (error) {
                throw _processSaveError(tableName, error);
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
                try {
                    sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, values);
                }
                catch (error) {
                    throw error;
                }
            }
            let result;
            try {
                result = (yield this._pool.query(sql, values));
            }
            catch (error) {
                throw _processSaveError(tableName, error);
            }
            return result.rowCount;
        });
    }
    findById(model, id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const select = this._buildSelect(this._connection.models[model], options.select);
            const tableName = this._connection.models[model].tableName;
            const sql = `SELECT ${select} FROM "${tableName}" WHERE id=$1 LIMIT 1`;
            if (options.explain) {
                return (yield this._pool.query(`EXPLAIN ${sql}`, [id]));
            }
            let result;
            try {
                result = (yield this._pool.query(sql, [id]));
            }
            catch (error) {
                throw PostgreSQLAdapter.wrapError('unknown error', error);
            }
            const rows = result && result.rows;
            if (rows && rows.length === 1) {
                return this._convertToModelInstance(model, rows[0], options);
            }
            else if (rows && rows.length > 1) {
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
                return yield this._pool.query(`EXPLAIN ${sql}`, params);
            }
            let result;
            try {
                result = yield this._pool.query(sql, params);
            }
            catch (error) {
                throw PostgreSQLAdapter.wrapError('unknown error', error);
            }
            const rows = result && result.rows;
            if (options.group_fields) {
                return rows.map((record) => {
                    return this._convertToGroupInstance(model, record, options.group_by, options.group_fields);
                });
            }
            else {
                return rows.map((record) => {
                    return this._convertToModelInstance(model, record, options);
                });
            }
        });
    }
    stream(model, conditions, options) {
        if (!QueryStream) {
            console.log('Install pg-query-stream module to use stream');
            process.exit(1);
        }
        let sql;
        let params;
        try {
            [sql, params] = this._buildSqlForFind(model, conditions, options);
        }
        catch (error) {
            const readable = new stream.Readable({ objectMode: true });
            readable._read = () => readable.emit('error', error);
            return readable;
        }
        const transformer = new stream.Transform({ objectMode: true });
        transformer._transform = (record, encoding, callback) => {
            transformer.push(this._convertToModelInstance(model, record, options));
            callback();
        };
        this._pool.connect().then((client) => {
            client.query(new QueryStream(sql, params)).on('end', () => {
                client.release();
            }).on('error', (error) => {
                transformer.emit('error', error);
            }).pipe(transformer);
        });
        return transformer;
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
                sql = `SELECT COUNT(*) AS count FROM (${sql}) _sub`;
            }
            let result;
            try {
                result = yield this._pool.query(sql, params);
            }
            catch (error) {
                throw PostgreSQLAdapter.wrapError('unknown error', error);
            }
            const rows = result && result.rows;
            if (rows && rows.length !== 1) {
                throw new Error('unknown error');
            }
            return Number(rows[0].count);
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
            let result;
            try {
                result = yield this._pool.query(sql, params);
            }
            catch (error) {
                if (error.code === '23503') {
                    throw new Error('rejected');
                }
                throw PostgreSQLAdapter.wrapError('unknown error', error);
            }
            if (result == null) {
                throw PostgreSQLAdapter.wrapError('unknown error');
            }
            return result.rowCount;
        });
    }
    /**
     * Connects to the database
     */
    connect(settings) {
        return __awaiter(this, void 0, void 0, function* () {
            // connect
            const pool = new pg.Pool({
                database: settings.database,
                host: settings.host,
                password: settings.password,
                port: settings.port,
                user: settings.user,
            });
            try {
                const client = yield pool.connect();
                client.release();
                this._pool = pool;
            }
            catch (error) {
                if (error.code === '3D000') {
                    throw new Error('database does not exist');
                }
                throw PostgreSQLAdapter.wrapError('failed to connect', error);
            }
        });
    }
    close() {
        this._pool.end();
        this._pool = null;
    }
    /**
     * Exposes pg module's query method
     */
    query() {
        return this._pool.query.apply(this._pool, arguments);
    }
    _param_place_holder(pos) {
        return '$' + pos;
    }
    valueToModel(value, property) {
        return value;
    }
    _getModelID(data) {
        return Number(data.id);
    }
    _buildSelect(model_class, select) {
        if (!select) {
            select = Object.keys(model_class._schema);
        }
        if (select.length > 0) {
            const schema = model_class._schema;
            const escape_ch = this._escape_ch;
            select = select.map((column) => {
                const property = schema[column];
                column = escape_ch + schema[column]._dbname + escape_ch;
                if (property.type_class === types.GeoPoint) {
                    return `ARRAY[ST_X(${column}), ST_Y(${column})] AS ${column}`;
                }
                else {
                    return column;
                }
            });
            return 'id,' + select.join(',');
        }
        else {
            return 'id';
        }
    }
    _getTables() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `SELECT table_name FROM INFORMATION_SCHEMA.TABLES
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
            const result = yield this._pool.query(query);
            const tables = result.rows.map((table) => table.table_name);
            return tables;
        });
    }
    _getSchema(table) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = 'SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name=$1';
            const result = yield this._pool.query(query, [table]);
            const schema = {};
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
        });
    }
    _getIndexes() {
        return __awaiter(this, void 0, void 0, function* () {
            // see http://stackoverflow.com/a/2213199/3239514
            const query = `SELECT t.relname AS table_name, i.relname AS index_name, a.attname AS column_name
      FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
      WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)`;
            const result = yield this._pool.query(query);
            const indexes = {};
            for (const row of result.rows) {
                const indexes_of_table = indexes[row.table_name] || (indexes[row.table_name] = {});
                (indexes_of_table[row.index_name] || (indexes_of_table[row.index_name] = {}))[row.column_name] = 1;
            }
            return indexes;
        });
    }
    _getForeignKeys() {
        return __awaiter(this, void 0, void 0, function* () {
            // see http://stackoverflow.com/a/1152321/3239514
            const query = `SELECT tc.table_name AS table_name, kcu.column_name AS column_name,
        ccu.table_name AS referenced_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY'`;
            const result = yield this._pool.query(query);
            const foreign_keys = {};
            for (const row of result.rows) {
                const foreign_keys_of_table = foreign_keys[row.table_name] || (foreign_keys[row.table_name] = {});
                foreign_keys_of_table[row.column_name] = row.referenced_table_name;
            }
            return foreign_keys;
        });
    }
    _buildUpdateSetOfColumn(property, data, values, fields, places, insert) {
        const dbname = property._dbname;
        const value = data[dbname];
        if (property.type_class === types.GeoPoint) {
            values.push(value[0]);
            values.push(value[1]);
            if (insert) {
                fields.push(`"${dbname}"`);
                return places.push(`ST_Point($${values.length - 1}, $${values.length})`);
            }
            else {
                return fields.push(`"${dbname}"=ST_Point($${values.length - 1}, $${values.length})`);
            }
        }
        else if ((value != null ? value.$inc : void 0) != null) {
            values.push(value.$inc);
            return fields.push(`"${dbname}"="${dbname}"+$${values.length}`);
        }
        else {
            values.push(value);
            if (insert) {
                fields.push(`"${dbname}"`);
                return places.push('$' + values.length);
            }
            else {
                return fields.push(`"${dbname}"=$${values.length}`);
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
        let order_by;
        if (options.near != null && Object.keys(options.near)[0]) {
            const field = Object.keys(options.near)[0];
            order_by = `"${field}_distance"`;
            const location = options.near[field];
            select += `,ST_Distance("${field}",ST_Point(${location[0]},${location[1]})) AS "${field}_distance"`;
        }
        const params = [];
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
        }
        else if ((options != null ? options.skip : void 0) != null) {
            sql += ' LIMIT ALL OFFSET ' + options.skip;
        }
        return [sql, params];
    }
}
exports.default = (connection) => {
    return new PostgreSQLAdapter(connection);
};
