"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const types = __importStar(require("../types"));
const util = __importStar(require("../util"));
/**
 * Base class for adapters
 * @namespace adapter
 */
class AdapterBase {
    constructor() {
        /** @internal */
        this.support_fractional_seconds = true;
        /** @internal */
        this.support_upsert = true;
        /** @internal */
        this.support_nested = false;
        /** @internal */
        this.support_geopoint = false;
        /** @internal */
        this.support_string_type_with_length = false;
        /** @internal */
        this.native_integrity = false;
    }
    /**
     * Wraps adapter specific errors
     * @param msg CORMO's error message
     * @param cause adapter specific error object
     * @internal
     */
    static wrapError(msg, cause) {
        if (msg === 'unknown error' && cause && cause.message === 'transaction finished') {
            return cause;
        }
        const error = new Error(msg);
        error.cause = cause;
        return error;
    }
    /** @internal */
    async connect(settings) {
        return Promise.resolve();
    }
    /**
     * Returns current schemas.
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    async getSchemas() {
        return Promise.resolve({ tables: {} });
    }
    /**
     * Creates a table.
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    async createTable(model) {
        return Promise.resolve();
    }
    /** Adds a column to a table
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    async addColumn(model, column_property) {
        return Promise.resolve();
    }
    /** Creates an index.
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    async createIndex(model_name, index) {
        return Promise.resolve();
    }
    /** Creates a foreign key.
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    async createForeignKey(model, column, type, references) {
        return Promise.resolve();
    }
    /**
     * Drops a model from the database
     * @abstract
     * @see BaseModel.drop
     * @internal
     */
    async drop(model) {
        return Promise.reject(new Error('not implemented'));
    }
    /** @internal */
    idToDB(value) {
        return value;
    }
    /** @internal */
    valueToDB(value, column, property) {
        if (property.type_class === types.Object || property.array) {
            return JSON.stringify(value);
        }
        else if (value != null) {
            return value;
        }
        else {
            return null;
        }
    }
    /** @internal */
    setValuesFromDB(instance, data, schema, selected_columns) {
        if (!selected_columns) {
            selected_columns = Object.keys(schema);
        }
        const support_nested = this.support_nested;
        for (const column of selected_columns) {
            const property = schema[column];
            let value = support_nested ? util.getPropertyOfPath(data, property._parts_db) : data[property._dbname_us];
            if (value != null) {
                value = this.valueToModel(value, property);
            }
            else {
                value = null;
            }
            util.setPropertyOfPath(instance, property._parts, value);
        }
    }
    getAdapterTypeString(column_property) {
        return;
    }
    /** @internal */
    async getConnection() {
        //
    }
    /** @internal */
    async releaseConnection(adapter_connection) {
        //
    }
    /** @internal */
    async startTransaction(adapter_connection, isolation_level) {
        //
    }
    /** @internal */
    async commitTransaction(adapter_connection) {
        //
    }
    /** @internal */
    async rollbackTransaction(adapter_connection) {
        //
    }
    /** @internal */
    _getModelID(data) {
        return data.id;
    }
    /** @internal */
    valueToModel(value, property) {
        if (property.type_class === types.Object || property.array) {
            return JSON.parse(value);
        }
        else {
            return value;
        }
    }
    /** @internal */
    _convertToModelInstance(model, data, options) {
        if (options.lean) {
            model = this._connection.models[model];
            const instance = {};
            this.setValuesFromDB(instance, data, model._schema, options.select);
            model._collapseNestedNulls(instance, options.select_raw, null);
            const id = this._getModelID(data);
            if (id) {
                instance.id = id;
            }
            return instance;
        }
        else {
            const id = this._getModelID(data);
            const modelClass = this._connection.models[model];
            return new modelClass(data, id, options.select, options.select_raw);
        }
    }
    /** @internal */
    _convertToGroupInstance(model_name, data, group_by, group_fields) {
        const instance = {};
        if (group_by) {
            const schema = this._connection.models[model_name]._schema;
            for (const field of group_by) {
                const property = lodash_1.default.find(schema, (item) => item._dbname_us === field);
                if (property) {
                    util.setPropertyOfPath(instance, property._parts, this.valueToModel(data[field], property));
                }
            }
        }
        for (const field in group_fields) {
            const expr = group_fields[field];
            const op = Object.keys(expr)[0];
            if (op === '$sum' || op === '$max' || op === '$min' || op === '$avg') {
                instance[field] = Number(data[field]);
            }
            else if (op === '$any') {
                instance[field] = data[field];
            }
        }
        return instance;
    }
    /** @internal */
    async _createBulkDefault(model, data, options) {
        return await Promise.all(data.map((item) => {
            return this.create(model, item, options);
        }));
    }
}
exports.AdapterBase = AdapterBase;
if (process.env.NODE_ENV === 'test') {
    AdapterBase.wrapError = (msg, cause) => {
        if (msg === 'unknown error' && cause && cause.message === 'transaction finished') {
            return cause;
        }
        return new Error(msg + ' caused by ' + cause.toString());
    };
}
