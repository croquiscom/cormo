"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let mysql;
try {
    // tslint:disable-next-line:no-var-requires
    mysql = require('mysql');
}
catch (error) {
    //
}
const _ = require("lodash");
const stream = require("stream");
const util = require("util");
const types = require("../types");
const sql_base_1 = require("./sql_base");
function _typeToSQL(property, support_fractional_seconds) {
    if (property.array) {
        return 'TEXT';
    }
    switch (property.type_class) {
        case types.String:
            return `VARCHAR(${property.type.length || 255})`;
        case types.Number:
            return 'DOUBLE';
        case types.Boolean:
            return 'BOOLEAN';
        case types.Integer:
            return 'INT';
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
function _propertyToSQL(property, support_fractional_seconds) {
    let type = _typeToSQL(property, support_fractional_seconds);
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
    if (error.code === 'ER_NO_SUCH_TABLE') {
        return new Error('table does not exist');
    }
    else if (error.code === 'ER_DUP_ENTRY') {
        const key = error.message.match(/for key '([^']*)'/);
        return new Error('duplicated ' + (key && key[1]));
    }
    else if (error.code === 'ER_BAD_NULL_ERROR') {
        const key = error.message.match(/Column '([^']*)'/);
        return new Error(`'${key && key[1]}' is required`);
    }
    else {
        return MySQLAdapter.wrapError('unknown error', error);
    }
}
async function _tryCreateConnection(config, count) {
    count--;
    let client;
    try {
        client = mysql.createConnection(Object.assign({}, config, { connectTimeout: 2000 }));
        client.connectAsync = util.promisify(client.connect);
        client.queryAsync = util.promisify(client.query);
        await client.connectAsync();
        return client;
    }
    catch (error) {
        client.end();
        if (error.errorno === 'ETIMEDOUT') {
            if (count > 0) {
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
        this.key_type = types.Integer;
        /** @internal */
        this.support_geopoint = true;
        /** @internal */
        this.support_string_type_with_length = true;
        /** @internal */
        this.native_integrity = true;
        /** @internal */
        this.support_isolation_level_read_uncommitted = true;
        /** @internal */
        this.support_isolation_level_repeatable_read = true;
        /** @internal */
        this._escape_ch = '`';
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
    async createTable(model) {
        const model_class = this._connection.models[model];
        const table_name = model_class.table_name;
        const column_sqls = [];
        // tslint:disable-next-line:forin
        for (const column in model_class._schema) {
            const property = model_class._schema[column];
            if (property.primary_key) {
                column_sqls.push(`\`${property._dbname_us}\` INT NOT NULL AUTO_INCREMENT UNIQUE PRIMARY KEY`);
            }
            else {
                const column_sql = _propertyToSQL(property, this.support_fractional_seconds);
                if (column_sql) {
                    column_sqls.push(`\`${property._dbname_us}\` ${column_sql}`);
                }
            }
        }
        let sql = `CREATE TABLE \`${table_name}\` ( ${column_sqls.join(',')} )`;
        sql += ` DEFAULT CHARSET=${this._settings.charset || 'utf8'}`;
        sql += ` COLLATE=${this._settings.collation || 'utf8_unicode_ci'}`;
        try {
            await this._client.queryAsync(sql);
        }
        catch (error) {
            throw MySQLAdapter.wrapError('unknown error', error);
        }
    }
    /** @internal */
    async addColumn(model, column_property) {
        const model_class = this._connection.models[model];
        const table_name = model_class.table_name;
        const column_sql = _propertyToSQL(column_property, this.support_fractional_seconds);
        const sql = `ALTER TABLE \`${table_name}\` ADD COLUMN \`${column_property._dbname_us}\` ${column_sql}`;
        try {
            await this._client.queryAsync(sql);
        }
        catch (error) {
            throw MySQLAdapter.wrapError('unknown error', error);
        }
    }
    /** @internal */
    async createIndex(model, index) {
        const model_class = this._connection.models[model];
        const table_name = model_class.table_name;
        const columns = [];
        // tslint:disable-next-line:forin
        for (const column in index.columns) {
            const order = index.columns[column];
            columns.push(`\`${column.replace(/\./g, '_')}\` ${(order === -1 ? 'DESC' : 'ASC')}`);
        }
        const unique = index.options.unique ? 'UNIQUE ' : '';
        const sql = `CREATE ${unique}INDEX \`${index.options.name}\` ON \`${table_name}\` (${columns.join(',')})`;
        try {
            await this._client.queryAsync(sql);
        }
        catch (error) {
            throw MySQLAdapter.wrapError('unknown error', error);
        }
    }
    /** @internal */
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
        const sql = `ALTER TABLE \`${table_name}\` ADD FOREIGN KEY (\`${column}\`)
      REFERENCES \`${references.table_name}\`(id) ON DELETE ${action}`;
        try {
            await this._client.queryAsync(sql);
        }
        catch (error) {
            throw MySQLAdapter.wrapError('unknown error', error);
        }
    }
    /** @internal */
    async drop(model) {
        const table_name = this._connection.models[model].table_name;
        try {
            await this._client.queryAsync(`DROP TABLE IF EXISTS \`${table_name}\``);
        }
        catch (error) {
            throw MySQLAdapter.wrapError('unknown error', error);
        }
    }
    /** @internal */
    async create(model, data, options) {
        const table_name = this._connection.models[model].table_name;
        const values = [];
        const [fields, places] = this._buildUpdateSet(model, data, values, true);
        const sql = `INSERT INTO \`${table_name}\` (${fields}) VALUES (${places})`;
        let result;
        try {
            result = await this.query(sql, values, options.transaction && options.transaction._adapter_connection);
        }
        catch (error) {
            throw _processSaveError(error);
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
    async createBulk(model, data, options) {
        const table_name = this._connection.models[model].table_name;
        const values = [];
        let fields;
        const places = [];
        data.forEach((item) => {
            let places_sub;
            [fields, places_sub] = this._buildUpdateSet(model, item, values, true);
            places.push('(' + places_sub + ')');
        });
        const sql = `INSERT INTO \`${table_name}\` (${fields}) VALUES ${places.join(',')}`;
        let result;
        try {
            result = await this.query(sql, values, options.transaction && options.transaction._adapter_connection);
        }
        catch (error) {
            throw _processSaveError(error);
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
    async update(model, data, options) {
        const table_name = this._connection.models[model].table_name;
        const values = [];
        const [fields] = this._buildUpdateSet(model, data, values);
        values.push(data.id);
        const sql = `UPDATE \`${table_name}\` SET ${fields} WHERE id=?`;
        try {
            await this.query(sql, values, options.transaction && options.transaction._adapter_connection);
        }
        catch (error) {
            throw _processSaveError(error);
        }
    }
    /** @internal */
    async updatePartial(model, data, conditions, options) {
        const table_name = this._connection.models[model].table_name;
        const values = [];
        const [fields] = this._buildPartialUpdateSet(model, data, values);
        let sql = `UPDATE \`${table_name}\` SET ${fields}`;
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
            result = await this.query(sql, values, options.transaction && options.transaction._adapter_connection);
        }
        catch (error) {
            throw _processSaveError(error);
        }
        if (result == null) {
            throw MySQLAdapter.wrapError('unknown error');
        }
        return result.affectedRows;
    }
    /** @internal */
    async upsert(model, data, conditions, options) {
        const table_name = this._connection.models[model].table_name;
        const insert_data = {};
        // tslint:disable-next-line:forin
        for (const key in data) {
            const value = data[key];
            if (value && value.$inc != null) {
                insert_data[key] = value.$inc;
            }
            else {
                insert_data[key] = value;
            }
        }
        for (const condition of conditions) {
            // tslint:disable-next-line:forin
            for (const key in condition) {
                const value = condition[key];
                insert_data[key] = value;
            }
        }
        const values = [];
        let fields;
        let places;
        [fields, places] = this._buildUpdateSet(model, insert_data, values, true);
        let sql = `INSERT INTO \`${table_name}\` (${fields}) VALUES (${places})`;
        [fields] = this._buildPartialUpdateSet(model, data, values);
        sql += ` ON DUPLICATE KEY UPDATE ${fields}`;
        try {
            await this.query(sql, values, options.transaction && options.transaction._adapter_connection);
        }
        catch (error) {
            throw _processSaveError(error);
        }
    }
    /** @internal */
    async findById(model, id, options) {
        id = this._convertValueType(id, this.key_type);
        const select = this._buildSelect(this._connection.models[model], options.select);
        const table_name = this._connection.models[model].table_name;
        const sql = `SELECT ${select} FROM \`${table_name}\` WHERE id=? LIMIT 1`;
        if (options.explain) {
            return await this.query(`EXPLAIN ${sql}`, id, options.transaction && options.transaction._adapter_connection);
        }
        let result;
        try {
            result = await this.query(sql, id, options.transaction && options.transaction._adapter_connection);
        }
        catch (error) {
            throw MySQLAdapter.wrapError('unknown error', error);
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
    }
    /** @internal */
    async find(model, conditions, options) {
        const [sql, params] = this._buildSqlForFind(model, conditions, options);
        if (options.explain) {
            return await this.query(`EXPLAIN ${sql}`, params, options.transaction && options.transaction._adapter_connection);
        }
        let result;
        try {
            result = await this.query(sql, params, options.transaction && options.transaction._adapter_connection);
        }
        catch (error) {
            throw MySQLAdapter.wrapError('unknown error', error);
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
    }
    /** @internal */
    stream(model, conditions, options) {
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
        this._connection._logger.logQuery(sql, params);
        this._client.query(sql, params).stream().on('error', (error) => {
            return transformer.emit('error', error);
        }).pipe(transformer);
        return transformer;
    }
    /** @internal */
    async count(model, conditions, options) {
        const params = [];
        const table_name = this._connection.models[model].table_name;
        let sql = `SELECT COUNT(*) AS count FROM \`${table_name}\``;
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
            result = await this.query(sql, params, options.transaction && options.transaction._adapter_connection);
        }
        catch (error) {
            throw MySQLAdapter.wrapError('unknown error', error);
        }
        if (result && result.length !== 1) {
            throw new Error('unknown error');
        }
        return Number(result[0].count);
    }
    /** @internal */
    async delete(model, conditions, options) {
        const params = [];
        const table_name = this._connection.models[model].table_name;
        let sql = `DELETE FROM \`${table_name}\``;
        if (conditions.length > 0) {
            sql += ' WHERE ' + this._buildWhere(this._connection.models[model]._schema, conditions, params);
        }
        let result;
        try {
            result = await this.query(sql, params, options.transaction && options.transaction._adapter_connection);
        }
        catch (error) {
            if (error && (error.code === 'ER_ROW_IS_REFERENCED_' || error.code === 'ER_ROW_IS_REFERENCED_2')) {
                throw new Error('rejected');
            }
            throw MySQLAdapter.wrapError('unknown error', error);
        }
        if (result == null) {
            throw MySQLAdapter.wrapError('unknown error');
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
        try {
            client = await _tryCreateConnection({
                charset: settings.charset,
                host: settings.host,
                password: settings.password,
                port: settings.port,
                user: settings.user,
            }, 3);
        }
        catch (error) {
            throw MySQLAdapter.wrapError('failed to connect', error);
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
            password: settings.password,
            port: settings.port,
            user: settings.user,
        });
        this._client.queryAsync = util.promisify(this._client.query);
        this._client.getConnectionAsync = util.promisify(this._client.getConnection);
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
        adapter_connection.queryAsync = util.promisify(adapter_connection.query);
        adapter_connection.beginTransactionAsync = util.promisify(adapter_connection.beginTransaction);
        adapter_connection.commitAsync = util.promisify(adapter_connection.commit);
        adapter_connection.rollbackAsync = util.promisify(adapter_connection.rollback);
        return adapter_connection;
    }
    /** @internal */
    async releaseConnection(adapter_connection) {
        adapter_connection.release();
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
    async query(text, values, adapter_connection) {
        this._connection._logger.logQuery(text, values);
        if (adapter_connection) {
            return await adapter_connection.queryAsync(text, values);
        }
        else {
            return await this._client.queryAsync(text, values);
        }
    }
    /**
     * Remove all unused connections from pool.
     */
    emptyFreeConnections() {
        if (!this._client) {
            return;
        }
        while (this._client._freeConnections.length > 0) {
            this._client._purgeConnection(this._client._freeConnections[0]);
        }
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
    async _getTables() {
        let tables = await this._client.queryAsync('SHOW TABLES');
        tables = tables.map((table) => {
            const key = Object.keys(table)[0];
            return table[key];
        });
        return tables;
    }
    /** @internal */
    async _getSchema(table) {
        const columns = await this._client.queryAsync(`SHOW COLUMNS FROM \`${table}\``);
        const schema = {};
        for (const column of columns) {
            const type = /^varchar\((\d*)\)/i.test(column.Type) ? new types.String(Number(RegExp.$1))
                : /^double/i.test(column.Type) ? new types.Number()
                    : /^tinyint\(1\)/i.test(column.Type) ? new types.Boolean()
                        : /^int/i.test(column.Type) ? new types.Integer()
                            : /^point/i.test(column.Type) ? new types.GeoPoint()
                                : /^datetime/i.test(column.Type) ? new types.Date()
                                    : /^text/i.test(column.Type) ? new types.Object() : undefined;
            schema[column.Field] = {
                required: column.Null === 'NO',
                type,
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
    /** @internal */
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
    /** @internal */
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
            order_by = `\`${field}_distance\``;
            const location = options.near[field];
            select += `,GLENGTH(LINESTRING(\`${field}\`,POINT(${location[0]},${location[1]}))) AS \`${field}_distance\``;
        }
        const params = [];
        const table_name = this._connection.models[model].table_name;
        let sql = `SELECT ${select} FROM \`${table_name}\``;
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
                return `\`${column}\` ${order}`;
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
        catch (error) {
            if (error.code === 'ER_BAD_DB_ERROR') {
                try {
                    await client.queryAsync(`CREATE DATABASE \`${this._database}\``);
                }
                catch (error) {
                    throw MySQLAdapter.wrapError('unknown error', error);
                }
                return (await this._createDatabase(client));
            }
            else {
                const msg = error.code === 'ER_DBACCESS_DENIED_ERROR'
                    ? `no access right to the database '${this._database}'`
                    : 'unknown error';
                throw MySQLAdapter.wrapError(msg, error);
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
    }
}
exports.MySQLAdapter = MySQLAdapter;
exports.default = (connection) => {
    if (!mysql) {
        console.log('Install mysql module to use this adapter');
        process.exit(1);
    }
    return new MySQLAdapter(connection);
};
