"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgreSQLAdapter = void 0;
exports.createAdapter = createAdapter;
const stream_1 = __importDefault(require("stream"));
const lodash_1 = __importDefault(require("lodash"));
const types = __importStar(require("../types.js"));
const base_js_1 = require("./base.js");
const sql_base_js_1 = require("./sql_base.js");
let pg;
let QueryStream;
// @ts-expect-error no type definitions
const module_promise = Promise.resolve().then(() => __importStar(require('pg'))).then((m) => {
    pg = m.default;
    return Promise.resolve().then(() => __importStar(require('pg-query-stream'))).then((m2) => {
        QueryStream = m2.default;
    })
        .catch(() => {
        //
    });
})
    .catch(() => {
    //
});
function _typeToSQL(property) {
    if (property.array) {
        return 'JSON';
    }
    switch (property.type_class) {
        case types.String:
            return `CHARACTER VARYING(${property.type.length || 255})`;
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
            return property.type.dimension
                ? `VECTOR(${property.type.dimension})`
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
    }
    else {
        return base_js_1.AdapterBase.wrapError('unknown error', error);
    }
}
// Adapter for PostgreSQL
// @namespace adapter
class PostgreSQLAdapter extends sql_base_js_1.SQLAdapterBase {
    // Creates a PostgreSQL adapter
    /** @internal */
    constructor(connection) {
        super();
        /** @internal */
        this.key_type = types.Integer;
        /** @internal */
        this.support_geopoint = true;
        /** @internal */
        this.support_string_type_with_length = true;
        /** @internal */
        this.support_join = true;
        /** @internal */
        this.support_distinct = true;
        /** @internal */
        this.native_integrity = true;
        /** @internal */
        this.support_isolation_level_read_uncommitted = false;
        /** @internal */
        this.support_isolation_level_repeatable_read = false;
        /** @internal */
        this._contains_op = 'ILIKE';
        /** @internal */
        this._regexp_op = '~*';
        this._connection = connection;
    }
    /** @internal */
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
            await this._pool.query(sql);
        }
        catch (error) {
            throw PostgreSQLAdapter.wrapError('unknown error', error);
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
            await this._pool.query(sql);
        }
        catch (error) {
            throw PostgreSQLAdapter.wrapError('unknown error', error);
        }
    }
    /** @internal */
    async createForeignKey(model_name, column, type, references) {
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
        }
        catch (error) {
            throw PostgreSQLAdapter.wrapError('unknown error', error);
        }
    }
    /** @internal */
    async deleteAllIgnoringConstraint(model_list) {
        await Promise.all(model_list.map(async (model_name) => {
            const model_class = this._connection.models[model_name];
            if (!model_class) {
                return;
            }
            const table_name = model_class.table_name;
            await this.query(`ALTER TABLE "${table_name}" DISABLE TRIGGER ALL`);
            await this.query(`DELETE FROM "${table_name}"`);
            await this.query(`ALTER TABLE "${table_name}" ENABLE TRIGGER ALL`);
        }));
    }
    /** @internal */
    async drop(model_name) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return;
        }
        const table_name = model_class.table_name;
        try {
            await this._pool.query(`DROP TABLE IF EXISTS "${table_name}"`);
        }
        catch (error) {
            throw PostgreSQLAdapter.wrapError('unknown error', error);
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
            throw new Error('model not found');
        }
        const table_name = model_class.table_name;
        const values = [];
        const [fields, places] = this._buildUpdateSet(model_name, data, values, true, options.use_id_in_data);
        const sql = `INSERT INTO "${table_name}" (${fields}) VALUES (${places}) RETURNING id`;
        let result;
        try {
            result = await this.query(sql, values, options.transaction);
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
            places.push('(' + places_sub + ')');
        });
        const sql = `INSERT INTO "${table_name}" (${fields}) VALUES ${places.join(',')} RETURNING id`;
        let result;
        try {
            result = await this.query(sql, values, options.transaction);
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
    /** @internal */
    async update(model_name, data, options) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return;
        }
        const table_name = model_class.table_name;
        const values = [];
        const [fields] = this._buildUpdateSet(model_name, data, values);
        values.push(data.id);
        const sql = `UPDATE "${table_name}" SET ${fields} WHERE id=$${values.length}`;
        try {
            await this.query(sql, values, options.transaction);
        }
        catch (error) {
            throw _processSaveError(table_name, error);
        }
    }
    /** @internal */
    async updatePartial(model_name, data, conditions, options) {
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
        let result;
        try {
            result = await this.query(sql, values, options.transaction);
        }
        catch (error) {
            throw _processSaveError(table_name, error);
        }
        return result.rowCount;
    }
    /** @internal */
    async findById(model_name, id, options) {
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
        }
        catch (error) {
            throw PostgreSQLAdapter.wrapError('unknown error', error);
        }
        const rows = result && result.rows;
        if (rows && rows.length === 1) {
            return this._convertToModelInstance(model_name, rows[0], options);
        }
        else if (rows && rows.length > 1) {
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
            return await this.query(`EXPLAIN ${sql}`, params, options.transaction);
        }
        let result;
        try {
            result = await this.query(sql, params, options.transaction);
        }
        catch (error) {
            throw PostgreSQLAdapter.wrapError('unknown error', error);
        }
        const rows = result && result.rows;
        if (options.group_fields) {
            const model_class = this._connection.models[model_name];
            return rows.map((record) => {
                return this._convertToGroupInstance(model_name, record, options.group_by, options.group_fields, model_class?.query_record_id_as_string ?? false);
            });
        }
        else {
            return rows.map((record) => {
                return this._convertToModelInstance(model_name, record, options);
            });
        }
    }
    /** @internal */
    stream(model_name, conditions, options) {
        if (!QueryStream) {
            console.log('Install pg-query-stream module to use stream');
            process.exit(1);
        }
        let sql;
        let params;
        try {
            [sql, params] = this._buildSqlForFind(model_name, conditions, options);
        }
        catch (error) {
            const readable = new stream_1.default.Readable({ objectMode: true });
            readable._read = () => readable.emit('error', error);
            return readable;
        }
        const transformer = new stream_1.default.Transform({ objectMode: true });
        transformer._transform = (record, encoding, callback) => {
            transformer.push(this._convertToModelInstance(model_name, record, options));
            callback();
        };
        this._pool.connect().then((client) => {
            client
                .query(new QueryStream(sql, params))
                .on('end', () => {
                client.release();
            })
                .on('error', (error) => {
                transformer.emit('error', error);
            })
                .pipe(transformer);
        });
        return transformer;
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
            sql = `SELECT COUNT(*) AS count FROM (${sql}) _sub`;
        }
        if (options.distinct && !options.select) {
            sql = `SELECT COUNT(*) AS count FROM (${sql}) _sub`;
        }
        let result;
        try {
            result = await this.query(sql, params, options.transaction);
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
            sql += ' LIMIT ALL OFFSET ' + options.skip;
        }
        if (nested) {
            sql += ')';
        }
        let result;
        try {
            result = await this.query(sql, params, options.transaction);
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
     * @internal
     */
    async connect(settings) {
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
        }
        catch (error) {
            if (error.code === '3D000') {
                throw new Error('database does not exist');
            }
            throw PostgreSQLAdapter.wrapError('failed to connect', error);
        }
    }
    /** @internal */
    close() {
        this._pool.end();
        this._pool = null;
    }
    /** @internal */
    async getConnection() {
        const adapter_connection = await this._pool.connect();
        return adapter_connection;
    }
    /** @internal */
    async releaseConnection(adapter_connection) {
        adapter_connection.release();
        return Promise.resolve();
    }
    /** @internal */
    async startTransaction(adapter_connection, isolation_level) {
        if (isolation_level) {
            await adapter_connection.query(`START TRANSACTION ISOLATION LEVEL ${isolation_level}`);
        }
        else {
            await adapter_connection.query('START TRANSACTION');
        }
    }
    /** @internal */
    async commitTransaction(adapter_connection) {
        await adapter_connection.query('COMMIT');
    }
    /** @internal */
    async rollbackTransaction(adapter_connection) {
        await adapter_connection.query('ROLLBACK');
    }
    /**
     * Exposes pg module's query method
     */
    async query(text, values, transaction) {
        if (!this._pool) {
            await this._connection._promise_connection;
        }
        if (transaction && transaction._adapter_connection) {
            transaction.checkFinished();
            return await transaction._adapter_connection.query(text, values);
        }
        else {
            return await this._pool.query(text, values);
        }
    }
    /** @internal */
    _param_place_holder(pos) {
        return '$' + pos;
    }
    /** @internal */
    valueToModel(value, property, query_record_id_as_string) {
        if (property.type_class === types.BigInteger) {
            return Number(value);
        }
        else if (property.record_id && query_record_id_as_string) {
            if (property.array) {
                return value.map((item) => (item ? String(item) : null));
            }
            return String(value);
        }
        else if (property.type_class === types.Vector) {
            return JSON.parse(value);
        }
        return value;
    }
    /** @internal */
    _getModelID(data) {
        if (!data.id) {
            return null;
        }
        return Number(data.id);
    }
    /** @internal */
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
                return '_Base.' + column;
            }
        });
        return select.join(',');
    }
    /** @internal */
    _buildGroupExpr(schema, group_expr) {
        const op = Object.keys(group_expr)[0];
        if (op === '$any') {
            const sub_expr = group_expr[op];
            if (sub_expr.substr(0, 1) === '$') {
                let column = sub_expr.substr(1);
                column = schema[column]?._dbname_us || column;
                return `(ARRAY_AGG(${column}))[1]`;
            }
            else {
                throw new Error(`unknown expression '${JSON.stringify(op)}'`);
            }
        }
        else {
            return super._buildGroupExpr(schema, group_expr);
        }
    }
    /** @internal */
    async _getTables() {
        const query = `SELECT table_name FROM INFORMATION_SCHEMA.TABLES
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != 'spatial_ref_sys'`;
        const result = await this._pool.query(query);
        const tables = result.rows.map((table) => table.table_name);
        return tables;
    }
    /** @internal */
    async _getSchema(table) {
        const query = 'SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name=$1';
        const result = await this._pool.query(query, [table]);
        const schema = { columns: {} };
        for (const column of result.rows) {
            const type = column.data_type === 'character varying'
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
    async _getIndexes() {
        // see http://stackoverflow.com/a/2213199/3239514
        const query = `SELECT t.relname AS table_name, i.relname AS index_name, a.attname AS column_name
      FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
      WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)`;
        const result = await this._pool.query(query);
        const indexes = {};
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
    /** @internal */
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
        else if (property.type_class === types.Vector) {
            values.push(JSON.stringify(value));
            if (insert) {
                fields.push(`"${dbname}"`);
                places.push(`$${values.length}`);
            }
            else {
                fields.push(`"${dbname}"=$${values.length}`);
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
            values.push(data.id);
            fields.push('id');
            places.push('$' + values.length);
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
            const property = lodash_1.default.find(schema, (item) => item?._dbname_us === column);
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
        let order_by;
        if (options.near != null && Object.keys(options.near)[0]) {
            const field = Object.keys(options.near)[0];
            order_by = `"${field}_distance"`;
            const location = options.near[field];
            select += `,ST_Distance("${field}",ST_Point(${location[0]},${location[1]})) AS "${field}_distance"`;
        }
        const params = [];
        const table_name = model_class.table_name;
        const join_schemas = {};
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
            if (order_by) {
                orders.push(order_by);
            }
            sql += ' ORDER BY ' + orders.join(',');
        }
        if (options.limit) {
            sql += ' LIMIT ' + options.limit;
            if (options.skip) {
                sql += ' OFFSET ' + options.skip;
            }
        }
        else if (options.skip) {
            sql += ' LIMIT ALL OFFSET ' + options.skip;
        }
        return [sql, params];
    }
}
exports.PostgreSQLAdapter = PostgreSQLAdapter;
function createAdapter(connection) {
    return new PostgreSQLAdapter(connection);
}
