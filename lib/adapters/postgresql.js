"use strict";
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
function _processSaveError(table_name, error) {
    if (error.code === '42P01') {
        return new Error('table does not exist');
    }
    else if (error.code === '23505') {
        let column = '';
        let key = error.message.match(/unique constraint \"(.*)\"/);
        if (key != null) {
            column = key[1];
            key = column.match(new RegExp(`${table_name}_([^']*)_key`));
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
    async getSchemas() {
        const tables = await this._getTables();
        const table_schemas = {};
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
    async createTable(model) {
        const model_class = this._connection.models[model];
        const table_name = model_class.table_name;
        const column_sqls = [];
        // tslint:disable-next-line:forin
        for (const column in model_class._schema) {
            const property = model_class._schema[column];
            if (property.primary_key) {
                column_sqls.push(`"${property._dbname_us}" SERIAL PRIMARY KEY`);
            }
            else {
                const column_sql = _propertyToSQL(property);
                if (column_sql) {
                    column_sqls.push(`"${property._dbname_us}" ${column_sql}`);
                }
            }
        }
        const sql = `CREATE TABLE "${table_name}" ( ${column_sqls.join(',')} )`;
        try {
            await this._pool.query(sql);
        }
        catch (error) {
            throw PostgreSQLAdapter.wrapError('unknown error', error);
        }
    }
    async addColumn(model, column_property) {
        const model_class = this._connection.models[model];
        const table_name = model_class.table_name;
        const column_name = column_property._dbname_us;
        const sql = `ALTER TABLE "${table_name}" ADD COLUMN "${column_name}" ${_propertyToSQL(column_property)}`;
        try {
            await this._pool.query(sql);
        }
        catch (error) {
            throw PostgreSQLAdapter.wrapError('unknown error', error);
        }
    }
    async createIndex(model, index) {
        const model_class = this._connection.models[model];
        const table_name = model_class.table_name;
        const columns = [];
        // tslint:disable-next-line:forin
        for (const column in index.columns) {
            const order = index.columns[column];
            columns.push(`"${column.replace(/\./g, '_')}" ${(order === -1 ? 'DESC' : 'ASC')}`);
        }
        const unique = index.options.unique ? 'UNIQUE ' : '';
        const sql = `CREATE ${unique}INDEX "${index.options.name}" ON "${table_name}" (${columns.join(',')})`;
        try {
            await this._pool.query(sql);
        }
        catch (error) {
            throw PostgreSQLAdapter.wrapError('unknown error', error);
        }
    }
    async createForeignKey(model, column, type, references) {
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
        const sql = `ALTER TABLE "${table_name}" ADD FOREIGN KEY ("${column}")
      REFERENCES "${references.table_name}"(id) ON DELETE ${action}`;
        try {
            await this._pool.query(sql);
        }
        catch (error) {
            throw PostgreSQLAdapter.wrapError('unknown error', error);
        }
    }
    async drop(model) {
        const table_name = this._connection.models[model].table_name;
        try {
            await this._pool.query(`DROP TABLE IF EXISTS "${table_name}"`);
        }
        catch (error) {
            throw PostgreSQLAdapter.wrapError('unknown error', error);
        }
    }
    async create(model, data) {
        const table_name = this._connection.models[model].table_name;
        const values = [];
        const [fields, places] = this._buildUpdateSet(model, data, values, true);
        const sql = `INSERT INTO "${table_name}" (${fields}) VALUES (${places}) RETURNING id`;
        let result;
        try {
            result = await this._pool.query(sql, values);
        }
        catch (error) {
            throw _processSaveError(table_name, error);
        }
        const rows = result && result.rows;
        if (rows && rows.length === 1 && rows[0].id) {
            return rows[0].id;
        }
        else {
            throw new Error('unexpected rows');
        }
    }
    async createBulk(model, data) {
        const table_name = this._connection.models[model].table_name;
        const values = [];
        let fields;
        const places = [];
        data.forEach((item) => {
            let places_sub;
            [fields, places_sub] = this._buildUpdateSet(model, item, values, true);
            places.push('(' + places_sub + ')');
        });
        const sql = `INSERT INTO "${table_name}" (${fields}) VALUES ${places.join(',')} RETURNING id`;
        let result;
        try {
            result = await this._pool.query(sql, values);
        }
        catch (error) {
            throw _processSaveError(table_name, error);
        }
        const ids = result && result.rows.map((row) => row.id);
        if (ids && ids.length === data.length) {
            return ids;
        }
        else {
            throw new Error('unexpected rows');
        }
    }
    async update(model, data) {
        const table_name = this._connection.models[model].table_name;
        const values = [];
        const [fields] = this._buildUpdateSet(model, data, values);
        values.push(data.id);
        const sql = `UPDATE "${table_name}" SET ${fields} WHERE id=$${values.length}`;
        try {
            await this._pool.query(sql, values);
        }
        catch (error) {
            throw _processSaveError(table_name, error);
        }
    }
    async updatePartial(model, data, conditions, options) {
        const table_name = this._connection.models[model].table_name;
        const values = [];
        const [fields] = this._buildPartialUpdateSet(model, data, values);
        let sql = `UPDATE "${table_name}" SET ${fields}`;
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
            result = (await this._pool.query(sql, values));
        }
        catch (error) {
            throw _processSaveError(table_name, error);
        }
        return result.rowCount;
    }
    async findById(model, id, options) {
        const select = this._buildSelect(this._connection.models[model], options.select);
        const table_name = this._connection.models[model].table_name;
        const sql = `SELECT ${select} FROM "${table_name}" WHERE id=$1 LIMIT 1`;
        if (options.explain) {
            return (await this._pool.query(`EXPLAIN ${sql}`, [id]));
        }
        let result;
        try {
            result = (await this._pool.query(sql, [id]));
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
    }
    async find(model, conditions, options) {
        const [sql, params] = this._buildSqlForFind(model, conditions, options);
        if (options.explain) {
            return await this._pool.query(`EXPLAIN ${sql}`, params);
        }
        let result;
        try {
            result = await this._pool.query(sql, params);
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
    async count(model, conditions, options) {
        const params = [];
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
            sql = `SELECT COUNT(*) AS count FROM (${sql}) _sub`;
        }
        let result;
        try {
            result = await this._pool.query(sql, params);
        }
        catch (error) {
            throw PostgreSQLAdapter.wrapError('unknown error', error);
        }
        const rows = result && result.rows;
        if (rows && rows.length !== 1) {
            throw new Error('unknown error');
        }
        return Number(rows[0].count);
    }
    async delete(model, conditions) {
        const params = [];
        const table_name = this._connection.models[model].table_name;
        let sql = `DELETE FROM "${table_name}"`;
        if (conditions.length > 0) {
            sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, params);
        }
        let result;
        try {
            result = await this._pool.query(sql, params);
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
    }
    /**
     * Connects to the database
     */
    async connect(settings) {
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
        }
        catch (error) {
            if (error.code === '3D000') {
                throw new Error('database does not exist');
            }
            throw PostgreSQLAdapter.wrapError('failed to connect', error);
        }
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
        if (!data.id) {
            return null;
        }
        return Number(data.id);
    }
    _buildSelect(model_class, select) {
        if (!select) {
            select = Object.keys(model_class._schema);
        }
        const schema = model_class._schema;
        const escape_ch = this._escape_ch;
        select = select.map((column) => {
            const property = schema[column];
            column = escape_ch + schema[column]._dbname_us + escape_ch;
            if (property.type_class === types.GeoPoint) {
                return `ARRAY[ST_X(${column}), ST_Y(${column})] AS ${column}`;
            }
            else {
                return column;
            }
        });
        return select.join(',');
    }
    async _getTables() {
        const query = `SELECT table_name FROM INFORMATION_SCHEMA.TABLES
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != 'spatial_ref_sys'`;
        const result = await this._pool.query(query);
        const tables = result.rows.map((table) => table.table_name);
        return tables;
    }
    async _getSchema(table) {
        const query = 'SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name=$1';
        const result = await this._pool.query(query, [table]);
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
    }
    async _getIndexes() {
        // see http://stackoverflow.com/a/2213199/3239514
        const query = `SELECT t.relname AS table_name, i.relname AS index_name, a.attname AS column_name
      FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
      WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)`;
        const result = await this._pool.query(query);
        const indexes = {};
        for (const row of result.rows) {
            const indexes_of_table = indexes[row.table_name] || (indexes[row.table_name] = {});
            (indexes_of_table[row.index_name] || (indexes_of_table[row.index_name] = {}))[row.column_name] = 1;
        }
        return indexes;
    }
    async _getForeignKeys() {
        // see http://stackoverflow.com/a/1152321/3239514
        const query = `SELECT tc.table_name AS table_name, kcu.column_name AS column_name,
        ccu.table_name AS referenced_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY'`;
        const result = await this._pool.query(query);
        const foreign_keys = {};
        for (const row of result.rows) {
            const foreign_keys_of_table = foreign_keys[row.table_name] || (foreign_keys[row.table_name] = {});
            foreign_keys_of_table[row.column_name] = row.referenced_table_name;
        }
        return foreign_keys;
    }
    _buildUpdateSetOfColumn(property, data, values, fields, places, insert = false) {
        const dbname = property._dbname_us;
        const value = data[dbname];
        if (property.type_class === types.GeoPoint) {
            values.push(value[0]);
            values.push(value[1]);
            if (insert) {
                fields.push(`"${dbname}"`);
                places.push(`ST_Point($${values.length - 1}, $${values.length})`);
            }
            else {
                fields.push(`"${dbname}"=ST_Point($${values.length - 1}, $${values.length})`);
            }
        }
        else if (value && value.$inc != null) {
            values.push(value.$inc);
            fields.push(`"${dbname}"="${dbname}"+$${values.length}`);
        }
        else {
            values.push(value);
            if (insert) {
                fields.push(`"${dbname}"`);
                places.push('$' + values.length);
            }
            else {
                fields.push(`"${dbname}"=$${values.length}`);
            }
        }
    }
    _buildUpdateSet(model, data, values, insert = false) {
        const schema = this._connection.models[model]._schema;
        const fields = [];
        const places = [];
        // tslint:disable-next-line:forin
        for (const column in schema) {
            const property = schema[column];
            if (property.primary_key) {
                continue;
            }
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
            const property = _.find(schema, (item) => item._dbname_us === column);
            if (!property || property.primary_key) {
                continue;
            }
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
        const table_name = this._connection.models[model].table_name;
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
                column = schema[column] && schema[column]._dbname_us || column;
                return `"${column}" ${order}`;
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
        }
        else if (options && options.skip) {
            sql += ' LIMIT ALL OFFSET ' + options.skip;
        }
        return [sql, params];
    }
}
exports.default = (connection) => {
    return new PostgreSQLAdapter(connection);
};
