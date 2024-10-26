"use strict";
/* eslint-disable @typescript-eslint/no-unused-vars */
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
exports.AdapterBase = void 0;
const lodash_1 = __importDefault(require("lodash"));
const types = __importStar(require("../types.js"));
const util = __importStar(require("../util/index.js"));
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
        this.support_join = false;
        /** @internal */
        this.support_distinct = false;
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
    /** Get query for creating a table
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    getCreateTableQuery(model_name) {
        return null;
    }
    /**
     * Creates a table.
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    async createTable(model_name, verbose = false) {
        return Promise.resolve();
    }
    /** Get query for updating a table description
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    getUpdateTableDescriptionQuery(model_name) {
        return null;
    }
    /**
     * Update a table description.
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    async updateTableDescription(model_name, verbose = false) {
        return Promise.resolve();
    }
    /** Get query for adding a column
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    getAddColumnQuery(model_name, column_property) {
        return null;
    }
    /** Adds a column to a table
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    async addColumn(model_name, column_property, verbose = false) {
        return Promise.resolve();
    }
    /** Get query for updating a column description
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    getUpdateColumnDescriptionQuery(model_name, column_property) {
        return null;
    }
    /**
     * Update a column description.
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    async updateColumnDescription(model_name, column_property, verbose = false) {
        return Promise.resolve();
    }
    /** Get query for creating an index
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    getCreateIndexQuery(model_name, index) {
        return null;
    }
    /** Creates an index.
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    async createIndex(model_name, index, verbose = false) {
        return Promise.resolve();
    }
    /** Get query for creating a foreign key
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    getCreateForeignKeyQuery(model_name, column, type, references) {
        return null;
    }
    /** Creates a foreign key.
     * @abstract
     * @see Connection::applySchemas
     * @internal
     */
    async createForeignKey(model_name, column, type, references, verbose = false) {
        return Promise.resolve();
    }
    /**
     * Deletes all records with ignoring constraint
     * @abstract
     * @see BaseModel.drop
     * @internal
     */
    async deleteAllIgnoringConstraint(model_list) {
        return Promise.reject(new Error('not implemented'));
    }
    /**
     * Drops a model from the database
     * @abstract
     * @see BaseModel.drop
     * @internal
     */
    async drop(model_name) {
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
    setValuesFromDB(instance, data, schema, selected_columns, query_record_id_as_string) {
        if (!selected_columns) {
            selected_columns = Object.keys(schema);
        }
        const support_nested = this.support_nested;
        for (const column of selected_columns) {
            const property = schema[column];
            if (!property) {
                continue;
            }
            let value = support_nested ? util.getPropertyOfPath(data, property._parts_db) : data[property._dbname_us];
            if (value != null) {
                value = this.valueToModel(value, property, query_record_id_as_string);
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
    valueToModel(value, property, _query_record_id_as_string) {
        if (property.type_class === types.Object || property.array) {
            return JSON.parse(value);
        }
        else {
            return value;
        }
    }
    /** @internal */
    _convertToModelInstance(model_name, data, options) {
        if (options.lean) {
            const model_class = this._connection.models[model_name];
            if (!model_class) {
                return null;
            }
            const instance = {};
            this.setValuesFromDB(instance, data, model_class._schema, options.select, model_class.query_record_id_as_string);
            model_class._collapseNestedNulls(instance, options.select_raw, null);
            const raw_id = this._getModelID(data);
            const id = raw_id && model_class.query_record_id_as_string ? String(raw_id) : raw_id;
            if (id) {
                instance.id = id;
            }
            return instance;
        }
        else {
            const model_class = this._connection.models[model_name];
            const raw_id = this._getModelID(data);
            const id = raw_id && model_class.query_record_id_as_string ? String(raw_id) : raw_id;
            return new model_class(data, id, options.select, options.select_raw);
        }
    }
    /** @internal */
    _convertToGroupInstance(model_name, data, group_by, group_fields, query_record_id_as_string) {
        const instance = {};
        if (group_by) {
            const model_class = this._connection.models[model_name];
            if (!model_class) {
                return;
            }
            const schema = model_class._schema;
            for (const field of group_by) {
                const property = lodash_1.default.find(schema, (item) => item?._dbname_us === field);
                if (property) {
                    util.setPropertyOfPath(instance, property._parts, this.valueToModel(data[field], property, query_record_id_as_string));
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
    async _createBulkDefault(model_name, data, options) {
        return await Promise.all(data.map((item) => {
            return this.create(model_name, item, options);
        }));
    }
}
exports.AdapterBase = AdapterBase;
if (process.env.NODE_ENV === 'test') {
    AdapterBase.wrapError = (msg, cause) => {
        if (msg === 'unknown error' && cause.message === 'transaction finished') {
            return cause;
        }
        return new Error(msg + ' caused by ' + cause.toString());
    };
}
