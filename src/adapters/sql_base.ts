import * as _ from 'lodash';
import { IColumnPropertyInternal, IModelSchemaInternal } from '../model';
import * as types from '../types';
import { AdapterBase } from './base';

// Base class for SQL adapters
// @namespace adapter
abstract class SQLAdapterBase extends AdapterBase {
  protected _contains_op = 'LIKE';
  protected _regexp_op: string | null = 'REGEXP';
  protected _false_value = 'FALSE';
  protected _escape_ch = '"';

  public async upsert(model: any, data: any, conditions: any, options: any) {
    const count = await this.updatePartial(model, data, conditions, options);
    if (count > 0) {
      return;
    }
    const insert_data: any = {};
    // tslint:disable-next-line:forin
    for (const key in data) {
      const value = data[key];
      if (value && value.$inc != null) {
        insert_data[key] = value.$inc;
      } else {
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
    try {
      return await this.create(model, insert_data);
    } catch (error) {
      if (!/duplicated/.test(error.message)) {
        throw error;
      }
      return await this.updatePartial(model, data, conditions, options);
    }
  }

  protected _param_place_holder(pos: any) {
    return '?';
  }

  protected _convertValueType(value: any, property_type_class: any) {
    if (property_type_class === types.Date) {
      value = new Date(value);
    } else if (property_type_class === types.Number) {
      value = Number(value);
      if (isNaN(value)) {
        value = Number.MAX_VALUE;
      }
    } else if (property_type_class === types.Integer) {
      value = Number(value);
      // tslint:disable-next-line:no-bitwise
      if (isNaN(value) || (value >> 0) !== value) {
        value = -2147483648;
      }
    }
    return value;
  }

  protected _buildWhereSingle(property: IColumnPropertyInternal, key: any, value: any, params: any): any {
    let property_type_class;
    if (key === 'id') {
      property_type_class = this.key_type;
    } else {
      if (property == null) {
        throw new Error(`unknown column '${key}'`);
      }
      property_type_class = property.type_class;
    }
    let column: any;
    if (property && !property_type_class) {
      // group field
      column = this._buildGroupExpr(property);
    } else {
      column = this._escape_ch + (property ? property._dbname_us : key.replace(/\./g, '_')) + this._escape_ch;
    }
    let op = '=';
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return this._false_value;
      }
      const values = value.map((v: any) => {
        params.push(v);
        return this._param_place_holder(params.length);
      });
      return `${column} IN (${values.join(',')})`;
    } else if (typeof value === 'object' && value !== null && Object.keys(value).length === 1) {
      const keys = Object.keys(value);
      const sub_key = keys[0];
      switch (sub_key) {
        case '$not':
          if (value[sub_key] === null) {
            return `NOT ${column} IS NULL`;
          } else {
            return `(NOT (${this._buildWhereSingle(property, key, value[sub_key], params)}) OR ${column} IS NULL)`;
          }
          break;
        case '$in':
          {
            let values = value[sub_key];
            if (values.length === 0) {
              return this._false_value;
            }
            values = values.map((v: any) => {
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
        case '$contains':
          {
            op = ' ' + this._contains_op + ' ';
            let values = value[sub_key];
            if (!Array.isArray(values)) {
              values = [values];
            }
            if (values.length === 0) {
              return this._false_value;
            }
            values = values.map((v: any) => {
              params.push('%' + v + '%');
              return column + op + this._param_place_holder(params.length);
            });
            return `(${values.join(' OR ')})`;
          }
        case '$startswith':
          op = ' ' + this._contains_op + ' ';
          value = value[sub_key];
          params.push(value + '%');
          return column + op + this._param_place_holder(params.length);
        case '$endswith':
          op = ' ' + this._contains_op + ' ';
          value = value[sub_key];
          params.push('%' + value);
          return column + op + this._param_place_holder(params.length);
        default:
          throw new Error(`unknown operator '${sub_key}'`);
      }
    } else if (_.isRegExp(value)) {
      if (!this._regexp_op) {
        throw new Error('regular expression is not supported');
      }
      op = ' ' + this._regexp_op + ' ';
      value = value.source;
    } else if (value === null) {
      return `${column} IS NULL`;
    }
    params.push(this._convertValueType(value, property_type_class));
    return column + op + this._param_place_holder(params.length);
  }

  protected _buildWhere(schema: IModelSchemaInternal, conditions: any, params: any, conjunction = 'AND'): any {
    let subs: any[] = [];
    let keys: string[];
    if (Array.isArray(conditions)) {
      subs = conditions.map((condition) => {
        return this._buildWhere(schema, condition, params);
      });
    } else if (typeof conditions === 'object') {
      keys = Object.keys(conditions);
      if (keys.length === 0) {
        return '';
      }
      if (keys.length === 1) {
        const key = keys[0];
        if (key.substr(0, 1) === '$') {
          switch (key) {
            case '$and':
              return this._buildWhere(schema, conditions[key], params, 'AND');
            case '$or':
              return this._buildWhere(schema, conditions[key], params, 'OR');
          }
        } else {
          return this._buildWhereSingle(schema[key], key, conditions[key], params);
        }
      } else {
        subs = keys.map((key) => {
          return this._buildWhereSingle(schema[key], key, conditions[key], params);
        });
      }
    } else {
      throw new Error(`'${JSON.stringify(conditions)}' is not an object`);
    }
    if (subs.length === 0) {
      return '';
    } else if (subs.length === 1) {
      return subs[0];
    } else {
      return '(' + subs.join(' ' + conjunction + ' ') + ')';
    }
  }

  protected _buildGroupExpr(group_expr: any) {
    const op = Object.keys(group_expr)[0];
    if (op === '$sum') {
      const sub_expr = group_expr[op];
      if (sub_expr === 1) {
        return 'COUNT(*)';
      } else if (sub_expr.substr(0, 1) === '$') {
        return `SUM(${sub_expr.substr(1)})`;
      } else {
        throw new Error(`unknown expression '${JSON.stringify(op)}'`);
      }
    } else if (op === '$min') {
      const sub_expr = group_expr[op];
      if (sub_expr.substr(0, 1) === '$') {
        return `MIN(${sub_expr.substr(1)})`;
      } else {
        throw new Error(`unknown expression '${JSON.stringify(op)}'`);
      }
    } else if (op === '$max') {
      const sub_expr = group_expr[op];
      if (sub_expr.substr(0, 1) === '$') {
        return `MAX(${sub_expr.substr(1)})`;
      } else {
        throw new Error(`unknown expression '${JSON.stringify(op)}'`);
      }
    } else {
      throw new Error(`unknown expression '${JSON.stringify(op)}'`);
    }
  }

  protected _buildGroupFields(group_by: any, group_fields: any) {
    const selects: any[] = [];
    if (group_by) {
      [].push.apply(selects, group_by);
    }
    // tslint:disable-next-line:forin
    for (const field in group_fields) {
      const expr = group_fields[field];
      selects.push(`${this._buildGroupExpr(expr)} as ${field}`);
    }
    return selects.join(',');
  }

  protected _buildSelect(model_class: any, select: any) {
    if (select) {
      const schema = model_class._schema;
      const escape_ch = this._escape_ch;
      select = select.map((column: any) => `${escape_ch}${schema[column]._dbname_us}${escape_ch}`);
      return select.join(',');
    } else {
      return '*';
    }
  }
}

export { SQLAdapterBase };
