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
const types = require("../types");
const util = require("../util");
/**
 * Base class for adapters
 * @namespace adapter
 */
class AdapterBase {
    constructor() {
        this.support_fractional_seconds = true;
        this.support_upsert = true;
        this.support_nested = false;
        this.support_geopoint = false;
        this.support_string_type_with_length = false;
        this.native_integrity = false;
    }
    /**
     * Wraps adapter specific errors
     * @param msg CORMO's error message
     * @param cause adapter specific error object
     */
    static wrapError(msg, cause) {
        const error = new Error(msg);
        error.cause = cause;
        return error;
    }
    connect(settings) {
        return __awaiter(this, void 0, void 0, function* () {
            return;
        });
    }
    /**
     * Returns current schemas.
     * @abstract
     * @see Connection::applySchemas
     */
    getSchemas() {
        return __awaiter(this, void 0, void 0, function* () {
            return { tables: {} };
        });
    }
    /**
     * Creates a table.
     * @abstract
     * @see Connection::applySchemas
     */
    createTable(model) {
        return __awaiter(this, void 0, void 0, function* () {
            return;
        });
    }
    /** Adds a column to a table
     * @abstract
     * @see Connection::applySchemas
     */
    addColumn(model, column_property) {
        return __awaiter(this, void 0, void 0, function* () {
            return;
        });
    }
    /** Creates an index.
     * @abstract
     * @see Connection::applySchemas
     */
    createIndex(model, index) {
        return __awaiter(this, void 0, void 0, function* () {
            return;
        });
    }
    /** Creates a foreign key.
     * @abstract
     * @see Connection::applySchemas
     */
    createForeignKey(model, column, type, references) {
        return __awaiter(this, void 0, void 0, function* () {
            return;
        });
    }
    /**
     * Drops a model from the database
     * @abstract
     * @see Model.drop
     */
    drop(model) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('not implemented');
        });
    }
    idToDB(value) {
        return value;
    }
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
    setValuesFromDB(instance, data, schema, selected_columns) {
        if (!selected_columns) {
            selected_columns = Object.keys(schema);
        }
        const support_nested = this.support_nested;
        const results = [];
        for (const column of selected_columns) {
            const property = schema[column];
            const parts = property._parts;
            let value = support_nested ? util.getPropertyOfPath(data, parts) : data[property._dbname];
            if (value != null) {
                value = this.valueToModel(value, property);
            }
            else {
                value = null;
            }
            results.push(util.setPropertyOfPath(instance, parts, value));
        }
        return results;
    }
    _getModelID(data) {
        return data.id;
    }
    valueToModel(value, property) {
        if (property.type_class === types.Object || property.array) {
            return JSON.parse(value);
        }
        else {
            return value;
        }
    }
    _convertToModelInstance(model, data, options) {
        if (options.lean) {
            model = this._connection.models[model];
            const instance = {};
            this.setValuesFromDB(instance, data, model._schema, options.select);
            model._collapseNestedNulls(instance, options.select_raw, null);
            instance.id = this._getModelID(data);
            return instance;
        }
        else {
            const id = this._getModelID(data);
            const modelClass = this._connection.models[model];
            return new modelClass(data, id, options.select, options.select_raw);
        }
    }
    _convertToGroupInstance(model, data, group_by, group_fields) {
        const instance = {};
        if (group_by) {
            const schema = this._connection.models[model]._schema;
            for (const field of group_by) {
                const property = schema[field];
                if (property) {
                    instance[field] = this.valueToModel(data[field], property);
                }
            }
        }
        // tslint:disable-next-line:forin
        for (const field in group_fields) {
            const expr = group_fields[field];
            const op = Object.keys(expr)[0];
            if (op === '$sum' || op === '$max' || op === '$min') {
                instance[field] = Number(data[field]);
            }
        }
        return instance;
    }
    _createBulkDefault(model, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield Promise.all(data.map((item) => {
                return this.create(model, item);
            }));
        });
    }
}
exports.AdapterBase = AdapterBase;
if (process.env.NODE_ENV === 'test') {
    AdapterBase.wrapError = (msg, cause) => {
        return new Error(msg + ' caused by ' + cause.toString());
    };
}
