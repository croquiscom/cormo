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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLAdapterBase = void 0;
const lodash_1 = __importDefault(require("lodash"));
const types = __importStar(require("../types.js"));
const base_js_1 = require("./base.js");
// Base class for SQL adapters
// @namespace adapter
class SQLAdapterBase extends base_js_1.AdapterBase {
    constructor() {
        super(...arguments);
        /** @internal */
        this._contains_op = 'LIKE';
        /** @internal */
        this._contains_escape_op = '';
        /** @internal */
        this._regexp_op = 'REGEXP';
        /** @internal */
        this._false_value = 'FALSE';
        /** @internal */
        this._escape_ch = '"';
    }
    /** @internal */
    async upsert(model_name, data, conditions, options) {
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
            if (!options.ignore_on_update?.includes(key)) {
                update_data[key] = value;
            }
        }
        for (const condition of conditions) {
            for (const key in condition) {
                const value = condition[key];
                insert_data[key] = value;
            }
        }
        if (Object.keys(update_data).length === 0) {
            try {
                return await this.create(model_name, insert_data, {});
            }
            catch (error) {
                if (!/duplicated/.test(error.message)) {
                    throw error;
                }
            }
        }
        else {
            const count = await this.updatePartial(model_name, update_data, conditions, options);
            if (count > 0) {
                return;
            }
            try {
                return await this.create(model_name, insert_data, {});
            }
            catch (error) {
                if (!/duplicated/.test(error.message)) {
                    throw error;
                }
                return await this.updatePartial(model_name, update_data, conditions, options);
            }
        }
    }
    /** @internal */
    _param_place_holder(_pos) {
        return '?';
    }
    /** @internal */
    _convertValueType(value, property_type_class) {
        if (property_type_class === types.Date) {
            value = new Date(value);
        }
        else if (property_type_class === types.Number) {
            value = Number(value);
            if (isNaN(value)) {
                value = Number.MAX_VALUE;
            }
        }
        else if (property_type_class === types.Integer) {
            value = Number(value);
            if (isNaN(value) || value >> 0 !== value) {
                value = -2147483648;
            }
        }
        else if (property_type_class === types.BigInteger) {
            value = Number(value);
            if (isNaN(value) || !Number.isSafeInteger(value)) {
                value = -9007199254740991;
            }
        }
        return value;
    }
    /** @internal */
    _buildWhereSingle(schema, property, key, key_prefix, value, params) {
        let property_type_class;
        if (key === 'id') {
            property_type_class = this.key_type;
        }
        else {
            if (property == null) {
                throw new Error(`unknown column '${key}'`);
            }
            property_type_class = property.type_class;
        }
        let column;
        if (property && !property_type_class) {
            // group field
            column = this._buildGroupExpr(schema, property);
        }
        else {
            column =
                key_prefix + this._escape_ch + (property ? property._dbname_us : key.replace(/\./g, '_')) + this._escape_ch;
        }
        let op = '=';
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return this._false_value;
            }
            const values = value.map((v) => {
                params.push(v);
                return this._param_place_holder(params.length);
            });
            return `${column} IN (${values.join(',')})`;
        }
        else if (typeof value === 'object' && value !== null && Object.keys(value).length === 1) {
            const keys = Object.keys(value);
            const sub_key = keys[0];
            switch (sub_key) {
                case '$not':
                    if (value[sub_key] === null) {
                        return `NOT ${column} IS NULL`;
                    }
                    else {
                        const sub_expr = this._buildWhereSingle(schema, property, key, key_prefix, value[sub_key], params);
                        return `(NOT (${sub_expr}) OR ${column} IS NULL)`;
                    }
                    break;
                case '$in': {
                    let values = value[sub_key];
                    if (values.length === 0) {
                        return this._false_value;
                    }
                    values = values.map((v) => {
                        params.push(v);
                        return this._param_place_holder(params.length);
                    });
                    return `${column} IN (${values.join(',')})`;
                }
                case '$gt':
                    op = '>';
                    value = value[sub_key];
                    break;
                case '$lt':
                    op = '<';
                    value = value[sub_key];
                    break;
                case '$gte':
                    op = '>=';
                    value = value[sub_key];
                    break;
                case '$lte':
                    op = '<=';
                    value = value[sub_key];
                    break;
                case '$ceq':
                case '$cne':
                case '$cgt':
                case '$clt':
                case '$cgte':
                case '$clte': {
                    const sub_expr = value[sub_key];
                    if (sub_expr.substr(0, 1) === '$') {
                        let compare_column = sub_expr.substr(1);
                        compare_column = schema[compare_column]?._dbname_us || compare_column;
                        op =
                            sub_key === '$cgt'
                                ? '>'
                                : sub_key === '$cgte'
                                    ? '>='
                                    : sub_key === '$clt'
                                        ? '<'
                                        : sub_key === '$clte'
                                            ? '<='
                                            : sub_key === '$ceq'
                                                ? '='
                                                : '!=';
                        return `${column} ${op} ${compare_column}`;
                    }
                    else {
                        throw new Error(`unknown expression '${sub_expr}'`);
                    }
                }
                case '$contains': {
                    op = ' ' + this._contains_op + ' ';
                    let values = value[sub_key];
                    if (!Array.isArray(values)) {
                        values = [values];
                    }
                    if (values.length === 0) {
                        return this._false_value;
                    }
                    values = values.map((v) => {
                        params.push('%' + v.replace(/[%_]/g, (a) => `\\${a}`) + '%');
                        return column + op + this._param_place_holder(params.length) + ' ' + this._contains_escape_op;
                    });
                    return `(${values.join(' OR ')})`;
                }
                case '$startswith':
                    op = ' ' + this._contains_op + ' ';
                    value = value[sub_key];
                    params.push(value.replace(/[%_]/g, (a) => `\\${a}`) + '%');
                    return column + op + this._param_place_holder(params.length) + ' ' + this._contains_escape_op;
                case '$endswith':
                    op = ' ' + this._contains_op + ' ';
                    value = value[sub_key];
                    params.push('%' + value.replace(/[%_]/g, (a) => `\\${a}`));
                    return column + op + this._param_place_holder(params.length) + ' ' + this._contains_escape_op;
                default:
                    throw new Error(`unknown operator '${sub_key}'`);
            }
        }
        else if (lodash_1.default.isRegExp(value)) {
            if (!this._regexp_op) {
                throw new Error('regular expression is not supported');
            }
            op = ' ' + this._regexp_op + ' ';
            value = value.source;
        }
        else if (value === null) {
            return `${column} IS NULL`;
        }
        params.push(this._convertValueType(value, property_type_class));
        return column + op + this._param_place_holder(params.length);
    }
    /** @internal */
    _buildWhereSingleJoin(schema, base_alias, join_schemas, key, value, params) {
        const model = key.split('.', 1)[0];
        const join_model_class = join_schemas[model];
        if (join_model_class) {
            // if key is 'JoinModel.column'
            const property = join_model_class[key.substring(model.length + 1)];
            return this._buildWhereSingle(join_model_class, property, key, `_${model}.`, value, params);
        }
        return this._buildWhereSingle(schema, schema[key], key, base_alias ? base_alias + '.' : '', value, params);
    }
    /** @internal */
    _buildWhere(schema, base_alias, join_schemas, conditions, params, conjunction = 'AND') {
        let subs = [];
        let keys;
        if (Array.isArray(conditions)) {
            subs = conditions.map((condition) => {
                return this._buildWhere(schema, base_alias, join_schemas, condition, params);
            });
        }
        else if (typeof conditions === 'object') {
            keys = Object.keys(conditions);
            if (keys.length === 0) {
                return '';
            }
            if (keys.length === 1) {
                const key = keys[0];
                if (key.startsWith('$')) {
                    switch (key) {
                        case '$and':
                            return this._buildWhere(schema, base_alias, join_schemas, conditions[key], params, 'AND');
                        case '$or':
                            return this._buildWhere(schema, base_alias, join_schemas, conditions[key], params, 'OR');
                    }
                }
                else {
                    return this._buildWhereSingleJoin(schema, base_alias, join_schemas, key, conditions[key], params);
                }
            }
            else {
                subs = keys.map((key) => {
                    return this._buildWhereSingleJoin(schema, base_alias, join_schemas, key, conditions[key], params);
                });
            }
        }
        else {
            throw new Error(`'${JSON.stringify(conditions)}' is not an object`);
        }
        if (subs.length === 0) {
            return '';
        }
        else if (subs.length === 1) {
            return subs[0];
        }
        else {
            return '(' + subs.join(' ' + conjunction + ' ') + ')';
        }
    }
    /** @internal */
    _buildGroupExpr(schema, group_expr) {
        const op = Object.keys(group_expr)[0];
        if (op === '$sum') {
            const sub_expr = group_expr[op];
            if (sub_expr === 1) {
                return 'COUNT(*)';
            }
            else if (sub_expr.substr(0, 1) === '$') {
                let column = sub_expr.substr(1);
                column = schema[column]?._dbname_us || column;
                return `SUM(${this._escape_ch}${column}${this._escape_ch})`;
            }
            else {
                throw new Error(`unknown expression '${JSON.stringify(op)}'`);
            }
        }
        else if (op === '$min') {
            const sub_expr = group_expr[op];
            if (sub_expr.substr(0, 1) === '$') {
                let column = sub_expr.substr(1);
                column = schema[column]?._dbname_us || column;
                return `MIN(${this._escape_ch}${column}${this._escape_ch})`;
            }
            else {
                throw new Error(`unknown expression '${JSON.stringify(op)}'`);
            }
        }
        else if (op === '$max') {
            const sub_expr = group_expr[op];
            if (sub_expr.substr(0, 1) === '$') {
                let column = sub_expr.substr(1);
                column = schema[column]?._dbname_us || column;
                return `MAX(${this._escape_ch}${column}${this._escape_ch})`;
            }
            else {
                throw new Error(`unknown expression '${JSON.stringify(op)}'`);
            }
        }
        else if (op === '$avg') {
            const sub_expr = group_expr[op];
            if (sub_expr.substr(0, 1) === '$') {
                let column = sub_expr.substr(1);
                column = schema[column]?._dbname_us || column;
                return `AVG(${this._escape_ch}${column}${this._escape_ch})`;
            }
            else {
                throw new Error(`unknown expression '${JSON.stringify(op)}'`);
            }
        }
        else if (op === '$any') {
            const sub_expr = group_expr[op];
            if (sub_expr.substr(0, 1) === '$') {
                let column = sub_expr.substr(1);
                column = schema[column]?._dbname_us || column;
                return `${this._escape_ch}${column}${this._escape_ch}`;
            }
            else {
                throw new Error(`unknown expression '${JSON.stringify(op)}'`);
            }
        }
        else {
            throw new Error(`unknown expression '${JSON.stringify(op)}'`);
        }
    }
    /** @internal */
    _buildGroupFields(model_class, group_by, group_fields) {
        const selects = [];
        if (group_by) {
            const escape_ch = this._escape_ch;
            for (const column of group_by) {
                selects.push(`_Base.${escape_ch}${column}${escape_ch}`);
            }
        }
        for (const field in group_fields) {
            const expr = group_fields[field];
            selects.push(`${this._buildGroupExpr(model_class._schema, expr)} as ${field}`);
        }
        return selects.join(',');
    }
    /** @internal */
    _buildSelect(model_class, select) {
        if (select) {
            const schema = model_class._schema;
            const escape_ch = this._escape_ch;
            select = select.map((column) => `_Base.${escape_ch}${schema[column]?._dbname_us}${escape_ch}`);
            return select.join(',');
        }
        else {
            return `_Base.*`;
        }
    }
}
exports.SQLAdapterBase = SQLAdapterBase;
