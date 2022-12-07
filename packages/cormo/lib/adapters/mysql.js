"use strict";
/* eslint-disable indent */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
exports.createAdapter = exports.MySQLAdapter = void 0;
let mysql;
let is_mysql2 = false;
const stream_1 = __importDefault(require("stream"));
const util_1 = __importDefault(require("util"));
const lodash_1 = __importDefault(require("lodash"));
const types = __importStar(require("../types"));
const sql_base_1 = require("./sql_base");
try {
    mysql = require('mysql2');
    is_mysql2 = true;
}
catch (error1) {
    try {
        mysql = require('mysql');
    }
    catch (error2) {
        //
    }
}
function _typeToSQL(property, support_fractional_seconds, major_version) {
    if (property.array) {
        return 'TEXT';
    }
    switch (property.type_class) {
        case types.String:
            return `VARCHAR(${property.type.length || 255})`;
        case types.Number:
            return 'DOUBLE';
        case types.Boolean:
            return 'TINYINT(1)';
        case types.Integer:
            return major_version < 6 ? 'INT(11)' : 'INT';
        case types.BigInteger:
            return major_version < 6 ? 'BIGINT(20)' : 'BIGINT';
        case types.GeoPoint:
            return 'POINT';
        case types.Date:
            if (support_fractional_seconds) {
                return 'DATETIME(3)';
            }
            else {
                return 'DATETIME';
            }
            break;
        case types.Object:
            return 'TEXT';
        case types.Text:
            return 'TEXT';
    }
}
function _propertyToSQL(property, support_fractional_seconds, major_version) {
    let type = _typeToSQL(property, support_fractional_seconds, major_version);
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
async function _tryCreateConnection(config, count = 0) {
    count++;
    let client;
    try {
        client = mysql.createConnection(Object.assign(Object.assign({}, config), { connectTimeout: 2000 }));
        client.connectAsync = util_1.default.promisify(client.connect);
        client.queryAsync = util_1.default.promisify(client.query);
        await client.connectAsync();
        return client;
    }
    catch (error) {
        try {
            client.end();
        }
        catch (e) {
            // ignore error
        }
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
class MySQLAdapter extends sql_base_1.SQLAdapterBase {
    // Creates a MySQL adapter
    /** @internal */
    constructor(connection) {
        super();
        /** @internal */
        this.key_type = types.BigInteger;
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
        this.support_isolation_level_read_uncommitted = true;
        /** @internal */
        this.support_isolation_level_repeatable_read = true;
        /** @internal */
        this._escape_ch = '`';
        /** @internal */
        this._read_clients = [];
        /** @internal */
        this._read_client_index = -1;
        /** @internal */
        this._version = { major: 0, minor: 0 };
        this._connection = connection;
        this._query_timeout = 60000;
    }
    /** @internal */
    async getSchemas() {
        const tables = await this._getTables();
        const table_schemas = {};
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
    getCreateTableQuery(model_name) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return '';
        }
        const table_name = model_class.table_name;
        const column_sqls = [];
        for (const column in model_class._schema) {
            const property = model_class._schema[column];
            if (!property) {
                continue;
            }
            if (property.primary_key) {
                column_sqls.push(`\`${property._dbname_us}\` BIGINT NOT NULL AUTO_INCREMENT UNIQUE PRIMARY KEY`);
            }
            else {
                let column_sql = _propertyToSQL(property, this.support_fractional_seconds, this._version.major);
                if (column_sql) {
                    if (property.description) {
                        column_sql += ` COMMENT ${mysql.escape(property.description)}`;
                    }
                    column_sqls.push(`\`${property._dbname_us}\` ${column_sql}`);
                }
            }
        }
        let query = `CREATE TABLE \`${table_name}\` ( ${column_sqls.join(',')} )`;
        query += ` DEFAULT CHARSET=${this._settings.charset || 'utf8'}`;
        query += ` COLLATE=${this._settings.collation || 'utf8_unicode_ci'}`;
        if (model_class.description) {
            query += ` COMMENT=${mysql.escape(model_class.description)}`;
        }
        return query;
    }
    /** @internal */
    async createTable(model_name, verbose = false) {
        const query = this.getCreateTableQuery(model_name);
        if (verbose) {
            console.log(`  (${query})`);
        }
        try {
            await this._client.queryAsync(query);
        }
        catch (error) {
            throw this._wrapError('unknown error', error);
        }
    }
    /** @internal */
    getUpdateTableDescriptionQuery(model_name) {
        var _a;
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return '';
        }
        const table_name = model_class.table_name;
        return `ALTER TABLE ${table_name} COMMENT ${mysql.escape((_a = model_class.description) !== null && _a !== void 0 ? _a : '')}`;
    }
    /** @internal */
    async updateTableDescription(model_name, verbose = false) {
        const query = this.getUpdateTableDescriptionQuery(model_name);
        if (verbose) {
            console.log(`  (${query})`);
        }
        try {
            await this._client.queryAsync(query);
        }
        catch (error) {
            throw this._wrapError('unknown error', error);
        }
    }
    /** @internal */
    getAddColumnQuery(model_name, column_property) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return '';
        }
        const table_name = model_class.table_name;
        let column_sql = _propertyToSQL(column_property, this.support_fractional_seconds, this._version.major);
        if (column_property.description) {
            column_sql += ` COMMENT ${mysql.escape(column_property.description)}`;
        }
        return `ALTER TABLE \`${table_name}\` ADD COLUMN \`${column_property._dbname_us}\` ${column_sql}`;
    }
    /** @internal */
    async addColumn(model_name, column_property, verbose = false) {
        const query = this.getAddColumnQuery(model_name, column_property);
        if (verbose) {
            console.log(`  (${query})`);
        }
        try {
            await this._client.queryAsync(query);
        }
        catch (error) {
            throw this._wrapError('unknown error', error);
        }
    }
    /** @internal */
    getUpdateColumnDescriptionQuery(model_name, column_property) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return '';
        }
        const table_name = model_class.table_name;
        let column_sql = _propertyToSQL(column_property, this.support_fractional_seconds, this._version.major);
        if (column_property.description) {
            column_sql += ` COMMENT ${mysql.escape(column_property.description)}`;
        }
        return `ALTER TABLE \`${table_name}\` CHANGE COLUMN \`${column_property._dbname_us}\` \`${column_property._dbname_us}\` ${column_sql}`;
    }
    /** @internal */
    async updateColumnDescription(model_name, column_property, verbose = false) {
        const query = this.getUpdateColumnDescriptionQuery(model_name, column_property);
        if (verbose) {
            console.log(`  (${query})`);
        }
        try {
            await this._client.queryAsync(query);
        }
        catch (error) {
            throw this._wrapError('unknown error', error);
        }
    }
    /** @internal */
    getCreateIndexQuery(model_name, index) {
        var _a;
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return '';
        }
        const schema = model_class._schema;
        const table_name = model_class.table_name;
        const columns = [];
        for (const column in index.columns) {
            const order = index.columns[column];
            columns.push(`\`${((_a = schema[column]) === null || _a === void 0 ? void 0 : _a._dbname_us) || column}\` ${order === -1 ? 'DESC' : 'ASC'}`);
        }
        const unique = index.options.unique ? 'UNIQUE ' : '';
        return `CREATE ${unique}INDEX \`${index.options.name}\` ON \`${table_name}\` (${columns.join(',')})`;
    }
    /** @internal */
    async createIndex(model_name, index, verbose = false) {
        const query = this.getCreateIndexQuery(model_name, index);
        if (verbose) {
            console.log(`  (${query})`);
        }
        try {
            await this._client.queryAsync(query);
        }
        catch (error) {
            throw this._wrapError('unknown error', error);
        }
    }
    /** @internal */
    getCreateForeignKeyQuery(model_name, column, type, references) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return '';
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
        return `ALTER TABLE \`${table_name}\` ADD FOREIGN KEY (\`${column}\`)
      REFERENCES \`${references.table_name}\`(id) ON DELETE ${action}`;
    }
    /** @internal */
    async createForeignKey(model_name, column, type, references, verbose = false) {
        const query = this.getCreateForeignKeyQuery(model_name, column, type, references);
        if (verbose) {
            console.log(`  (${query})`);
        }
        try {
            await this._client.queryAsync(query);
        }
        catch (error) {
            throw this._wrapError('unknown error', error);
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
            const connection = await this.getConnection();
            try {
                try {
                    await connection.queryAsync(`DELETE FROM \`${table_name}\``);
                }
                catch (error) {
                    // try again with ignoring foreign key constraints
                    await connection.queryAsync('SET FOREIGN_KEY_CHECKS = 0');
                    await connection.queryAsync(`DELETE FROM \`${table_name}\``);
                    await connection.queryAsync('SET FOREIGN_KEY_CHECKS = 1');
                }
            }
            finally {
                await this.releaseConnection(connection);
            }
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
            await this._client.queryAsync(`DROP TABLE IF EXISTS \`${table_name}\``);
        }
        catch (error) {
            throw this._wrapError('unknown error', error);
        }
    }
    /** @internal */
    getAdapterTypeString(column_property) {
        return _typeToSQL(column_property, this.support_fractional_seconds, this._version.major);
    }
    /** @internal */
    async create(model_name, data, options) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            throw new Error('model not found');
        }
        const table_name = model_class.table_name;
        const values = [];
        const [fields, places] = this._buildUpdateSet(model_name, data, values, true);
        const sql = `INSERT INTO \`${table_name}\` (${fields}) VALUES (${places})`;
        let result;
        try {
            result = await this.query(sql, values, { transaction: options.transaction });
        }
        catch (error) {
            throw this._processSaveError(error);
        }
        const id = result && result.insertId;
        if (id) {
            return id;
        }
        else {
            throw new Error('unexpected result');
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
            [fields, places_sub] = this._buildUpdateSet(model_name, item, values, true);
            places.push('(' + places_sub + ')');
        });
        const sql = `INSERT INTO \`${table_name}\` (${fields}) VALUES ${places.join(',')}`;
        let result;
        try {
            result = await this.query(sql, values, { transaction: options.transaction });
        }
        catch (error) {
            throw this._processSaveError(error);
        }
        const id = result && result.insertId;
        if (id) {
            return data.map((item, i) => id + i);
        }
        else {
            throw new Error('unexpected result');
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
        const sql = `UPDATE \`${table_name}\` SET ${fields} WHERE id=?`;
        try {
            await this.query(sql, values, { transaction: options.transaction });
        }
        catch (error) {
            throw this._processSaveError(error);
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
        let sql = `UPDATE \`${table_name}\` SET ${fields}`;
        if (conditions.length > 0) {
            sql += ' WHERE ' + this._buildWhere(model_class._schema, '', {}, conditions, values);
        }
        let result;
        try {
            result = await this.query(sql, values, { transaction: options.transaction });
        }
        catch (error) {
            throw this._processSaveError(error);
        }
        if (result == null) {
            throw this._wrapError('unknown error');
        }
        return result.affectedRows;
    }
    /** @internal */
    async upsert(model_name, data, conditions, options) {
        var _a;
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return;
        }
        const table_name = model_class.table_name;
        const insert_data = {};
        const update_data = {};
        for (const key in data) {
            const value = data[key];
            if (value && value.$inc != null) {
                insert_data[key] = value.$inc;
            }
            else {
                insert_data[key] = value;
            }
            if (!((_a = options.ignore_on_update) === null || _a === void 0 ? void 0 : _a.includes(key))) {
                update_data[key] = value;
            }
        }
        for (const condition of conditions) {
            for (const key in condition) {
                const value = condition[key];
                insert_data[key] = value;
            }
        }
        const values = [];
        let fields;
        let places = '';
        let sql = '';
        if (Object.keys(update_data).length === 0) {
            [fields, places] = this._buildUpdateSet(model_name, insert_data, values, true);
            sql = `INSERT IGNORE \`${table_name}\` (${fields}) VALUES (${places})`;
        }
        else {
            [fields, places] = this._buildUpdateSet(model_name, insert_data, values, true);
            sql = `INSERT INTO \`${table_name}\` (${fields}) VALUES (${places})`;
            [fields] = this._buildPartialUpdateSet(model_name, update_data, values);
            sql += ` ON DUPLICATE KEY UPDATE ${fields}`;
        }
        try {
            await this.query(sql, values, { transaction: options.transaction, node: options.node });
        }
        catch (error) {
            throw this._processSaveError(error);
        }
    }
    /** @internal */
    async findById(model_name, id, options) {
        id = this._convertValueType(id, this.key_type);
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            throw new Error('model not found');
        }
        const select = this._buildSelect(model_class, options.select);
        const table_name = model_class.table_name;
        const sql = `SELECT ${select} FROM \`${table_name}\` AS _Base WHERE id=? LIMIT 1`;
        if (options.explain) {
            return await this.query(`EXPLAIN ${sql}`, id, { transaction: options.transaction, node: options.node });
        }
        let result;
        try {
            result = await this.query(sql, id, { transaction: options.transaction, node: options.node });
        }
        catch (error) {
            throw this._wrapError('unknown error', error);
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
            return await this.query(`EXPLAIN ${sql}`, params, { transaction: options.transaction, node: options.node });
        }
        let result;
        try {
            result = await this.query(sql, params, { transaction: options.transaction, node: options.node });
        }
        catch (error) {
            throw this._wrapError('unknown error', error);
        }
        if (options.group_fields) {
            return result.map((record) => {
                return this._convertToGroupInstance(model_name, record, options.group_by, options.group_fields);
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
            const readable = new stream_1.default.Readable({ objectMode: true });
            readable._read = () => readable.emit('error', error);
            return readable;
        }
        const transformer = new stream_1.default.Transform({ objectMode: true });
        transformer._transform = (record, encoding, callback) => {
            transformer.push(this._convertToModelInstance(model_name, record, options));
            callback();
        };
        this._connection._logger.logQuery(sql, params);
        this._client
            .query(sql, params)
            .stream()
            .on('error', (error) => {
            return transformer.emit('error', error);
        })
            .pipe(transformer);
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
            ? `SELECT DISTINCT _Base.* FROM \`${table_name}\` AS _Base`
            : `SELECT COUNT(${options.distinct ? `DISTINCT ${select}` : '*'}) AS count FROM \`${table_name}\` AS _Base`;
        if (options.index_hint) {
            sql += ` ${options.index_hint}`;
        }
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
            result = await this.query(sql, params, { transaction: options.transaction, node: options.node });
        }
        catch (error) {
            throw this._wrapError('unknown error', error);
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
        const params = [];
        const table_name = model_class.table_name;
        let sql = `DELETE FROM \`${table_name}\``;
        if (conditions.length > 0) {
            sql += ' WHERE ' + this._buildWhere(model_class._schema, '', {}, conditions, params);
        }
        if (options.orders.length > 0) {
            const schema = model_class._schema;
            const orders = options.orders.map((order) => {
                var _a;
                let column;
                if (order[0] === '-') {
                    column = order.slice(1);
                    order = 'DESC';
                }
                else {
                    column = order;
                    order = 'ASC';
                }
                column = ((_a = schema[column]) === null || _a === void 0 ? void 0 : _a._dbname_us) || column;
                return `\`${column}\` ${order}`;
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
        let result;
        try {
            result = await this.query(sql, params, { transaction: options.transaction });
        }
        catch (error) {
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
    async connect(settings) {
        // connect
        let client;
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
        }
        catch (error) {
            if (error.code === 'ER_ACCESS_DENIED_ERROR') {
                throw error;
            }
            throw this._wrapError('failed to connect', error);
        }
        try {
            await this._createDatabase(client);
        }
        catch (error) {
            client.end();
            throw error;
        }
        try {
            await this._checkFeatures(client);
        }
        finally {
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
        this._client.queryAsync = util_1.default.promisify(this._client.query);
        this._client.getConnectionAsync = util_1.default.promisify(this._client.getConnection);
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
                read_client.queryAsync = util_1.default.promisify(read_client.query);
                read_client.getConnectionAsync = util_1.default.promisify(read_client.getConnection);
                this._read_clients.push(read_client);
            }
        }
    }
    /** @internal */
    close() {
        if (this._client) {
            this._client.end();
        }
        this._client = null;
    }
    /** @internal */
    async getConnection() {
        const adapter_connection = await this._client.getConnectionAsync();
        adapter_connection.queryAsync = util_1.default.promisify(adapter_connection.query);
        adapter_connection.beginTransactionAsync = util_1.default.promisify(adapter_connection.beginTransaction);
        adapter_connection.commitAsync = util_1.default.promisify(adapter_connection.commit);
        adapter_connection.rollbackAsync = util_1.default.promisify(adapter_connection.rollback);
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
            await adapter_connection.queryAsync(`SET TRANSACTION ISOLATION LEVEL ${isolation_level}`);
        }
        await adapter_connection.beginTransactionAsync();
    }
    /** @internal */
    async commitTransaction(adapter_connection) {
        await adapter_connection.commitAsync();
    }
    /** @internal */
    async rollbackTransaction(adapter_connection) {
        await adapter_connection.rollbackAsync();
    }
    /**
     * Exposes mysql module's query method
     */
    async query(text, values, options) {
        var _a;
        if (!this._client) {
            await this._connection._promise_connection;
        }
        const transaction = options && options.transaction;
        if (transaction && transaction._adapter_connection) {
            this._connection._logger.logQuery(text, values);
            transaction.checkFinished();
            return await transaction._adapter_connection.queryAsync({ sql: text, values, timeout: this._query_timeout });
        }
        else {
            let client = this._client;
            if (options &&
                options.node === 'read' &&
                this._read_clients.length > 0 &&
                text.substring(0, 6).toUpperCase() === 'SELECT') {
                this._read_client_index++;
                if (this._read_client_index >= this._read_clients.length || this._read_client_index < 0) {
                    this._read_client_index = 0;
                }
                client = this._read_clients[this._read_client_index];
            }
            this._connection._logger.logQuery(`[${client._node_id}] ${text}`, values);
            try {
                return await client.queryAsync({ sql: text, values, timeout: this._query_timeout });
            }
            catch (error) {
                if (((_a = this._settings) === null || _a === void 0 ? void 0 : _a.reconnect_if_read_only) && error.message.includes('read-only')) {
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
    emptyFreeConnections() {
        if (!this._client) {
            return;
        }
        if (is_mysql2) {
            const list = this._client._freeConnections.toArray();
            for (const connection of list) {
                connection.destroy();
            }
        }
        else {
            while (this._client._freeConnections.length > 0) {
                this._client._purgeConnection(this._client._freeConnections[0]);
            }
        }
    }
    getRunningQueries() {
        const queries = [];
        for (const conn of this._client._allConnections) {
            if (conn && conn._protocol && conn._protocol._queue && conn._protocol._queue.length > 0) {
                const query = conn._protocol._queue[0];
                queries.push(query.sql);
            }
        }
        return queries;
    }
    getPoolStatus() {
        const used = this._client._allConnections.length - this._client._freeConnections.length;
        const queued = this._client._connectionQueue.length;
        return { used, queued };
    }
    /** @internal */
    valueToModel(value, property) {
        if (property.type_class === types.Object || property.array) {
            try {
                return JSON.parse(value);
            }
            catch (error) {
                return null;
            }
        }
        else if (property.type_class === types.GeoPoint) {
            return [value.x, value.y];
        }
        else if (property.type_class === types.Boolean) {
            return value !== 0;
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
    _buildGroupExpr(schema, group_expr) {
        var _a;
        const op = Object.keys(group_expr)[0];
        if (op === '$any') {
            const sub_expr = group_expr[op];
            if (sub_expr.substr(0, 1) === '$') {
                let column = sub_expr.substr(1);
                column = ((_a = schema[column]) === null || _a === void 0 ? void 0 : _a._dbname_us) || column;
                return `ANY_VALUE(${column})`;
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
        const result = await this._client.queryAsync('SHOW TABLE STATUS');
        return result.map((item) => ({
            name: item.Name,
            comment: item.Comment,
        }));
    }
    /** @internal */
    async _getSchema(table) {
        const columns = await this._client.queryAsync(`SHOW FULL COLUMNS FROM \`${table}\``);
        const schema = { columns: {} };
        for (const column of columns) {
            const type = /^varchar\((\d*)\)/i.test(column.Type)
                ? new types.String(Number(RegExp.$1))
                : /^double/i.test(column.Type)
                    ? new types.Number()
                    : /^tinyint\(1\)/i.test(column.Type)
                        ? new types.Boolean()
                        : /^int/i.test(column.Type)
                            ? new types.Integer()
                            : /^bigint/i.test(column.Type)
                                ? new types.BigInteger()
                                : /^point/i.test(column.Type)
                                    ? new types.GeoPoint()
                                    : /^datetime/i.test(column.Type)
                                        ? new types.Date()
                                        : /^text/i.test(column.Type)
                                            ? new types.Text()
                                            : undefined;
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
    async _getIndexes() {
        const sql = 'SELECT * FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? ORDER BY SEQ_IN_INDEX';
        const rows = await this._client.queryAsync(sql, [this._database]);
        const indexes = {};
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
    async _getForeignKeys() {
        const sql = `SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE
      REFERENCED_TABLE_NAME IS NOT NULL AND CONSTRAINT_SCHEMA = ?`;
        const rows = await this._client.queryAsync(sql, [this._database]);
        const foreign_keys = {};
        for (const row of rows) {
            const foreign_keys_of_table = foreign_keys[row.TABLE_NAME] || (foreign_keys[row.TABLE_NAME] = {});
            foreign_keys_of_table[row.COLUMN_NAME] = row.REFERENCED_TABLE_NAME;
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
                fields.push(`\`${dbname}\``);
                places.push('POINT(?,?)');
            }
            else {
                fields.push(`\`${dbname}\`=POINT(?,?)`);
            }
        }
        else if (value && value.$inc != null) {
            values.push(value.$inc);
            fields.push(`\`${dbname}\`=\`${dbname}\`+?`);
        }
        else {
            values.push(value);
            if (insert) {
                fields.push(`\`${dbname}\``);
                places.push('?');
            }
            else {
                fields.push(`\`${dbname}\`=?`);
            }
        }
    }
    /** @internal */
    _buildUpdateSet(model_name, data, values, insert = false) {
        const model_class = this._connection.models[model_name];
        if (!model_class) {
            return ['', ''];
        }
        const schema = model_class._schema;
        const fields = [];
        const places = [];
        for (const column in schema) {
            const property = schema[column];
            if (property === null || property === void 0 ? void 0 : property.primary_key) {
                continue;
            }
            this._buildUpdateSetOfColumn(property, data, values, fields, places, insert);
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
            const property = lodash_1.default.find(schema, (item) => (item === null || item === void 0 ? void 0 : item._dbname_us) === column);
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
            order_by = `\`${field}_distance\``;
            const location = options.near[field];
            select += `,ST_Length(LINESTRING(\`${field}\`,POINT(${location[0]},${location[1]}))) AS \`${field}_distance\``;
        }
        const params = [];
        const table_name = model_class.table_name;
        const join_schemas = {};
        let sql = `SELECT ${options.distinct ? 'DISTINCT' : ''} ${select} FROM \`${table_name}\` AS _Base`;
        if (options.index_hint) {
            sql += ` ${options.index_hint}`;
        }
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
                var _a;
                let column;
                if (order[0] === '-') {
                    column = order.slice(1);
                    order = 'DESC';
                }
                else {
                    column = order;
                    order = 'ASC';
                }
                column = ((_a = schema[column]) === null || _a === void 0 ? void 0 : _a._dbname_us) || column;
                return `\`${column}\` ${order}`;
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
            sql += ' LIMIT 2147483647 OFFSET ' + options.skip;
        }
        return [sql, params];
    }
    // create database if not exist
    /** @internal */
    async _createDatabase(client) {
        try {
            // check database existence
            return await client.queryAsync(`USE \`${this._database}\``);
        }
        catch (error1) {
            if (error1.code === 'ER_BAD_DB_ERROR') {
                try {
                    await client.queryAsync(`CREATE DATABASE \`${this._database}\``);
                }
                catch (error2) {
                    throw this._wrapError('unknown error', error2);
                }
                return await this._createDatabase(client);
            }
            else {
                const msg = error1.code === 'ER_DBACCESS_DENIED_ERROR'
                    ? `no access right to the database '${this._database}'`
                    : 'unknown error';
                throw this._wrapError(msg, error1);
            }
        }
    }
    /** @internal */
    async _checkFeatures(client) {
        try {
            await client.queryAsync('CREATE TABLE _temp (date DATETIME(10))');
        }
        catch (error) {
            if (error.code === 'ER_PARSE_ERROR') {
                // MySQL 5.6.4 below does not support fractional seconds
                this.support_fractional_seconds = false;
            }
            else if (error.code === 'ER_TOO_BIG_PRECISION') {
                this.support_fractional_seconds = true;
            }
            else {
                throw error;
            }
        }
        try {
            const result = await client.queryAsync('SELECT VERSION() AS version');
            const version = result[0].version;
            const match = version.match(/(\d+)\.(\d+)\.(\d+)/);
            if (match) {
                this._version = { major: Number(match[1]), minor: Number(match[2]) };
            }
        }
        catch (error) {
            // ignore
        }
    }
    /** @internal */
    _processSaveError(error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return new Error('table does not exist');
        }
        else if (error.code === 'ER_DUP_ENTRY') {
            const key = error.message.match(/for key '([^']*)'/);
            return new Error('duplicated ' + (key && key[1].replace(/[^.]*\./, '')));
        }
        else if (error.code === 'ER_BAD_NULL_ERROR') {
            const key = error.message.match(/Column '([^']*)'/);
            return new Error(`'${key && key[1]}' is required`);
        }
        else {
            return this._wrapError('unknown error', error);
        }
    }
    /** @internal */
    _wrapError(msg, cause) {
        var _a;
        if (!((_a = this._settings) === null || _a === void 0 ? void 0 : _a.hide_unknown_error) && msg === 'unknown error' && cause) {
            return cause;
        }
        return MySQLAdapter.wrapError(msg, cause);
    }
}
exports.MySQLAdapter = MySQLAdapter;
function createAdapter(connection) {
    if (!mysql) {
        console.log('Install mysql module to use this adapter');
        process.exit(1);
    }
    return new MySQLAdapter(connection);
}
exports.createAdapter = createAdapter;
