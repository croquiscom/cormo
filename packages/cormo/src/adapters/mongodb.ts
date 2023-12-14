/* eslint-disable indent */

let mongodb: any;

try {
  mongodb = require('mongodb');
} catch (error: any) {
  //
}

export interface AdapterSettingsMongoDB {
  host?: string;
  port?: number;
  user?: string | Promise<string>;
  password?: string | Promise<string>;
  database: string;
}

class CormoTypesObjectId {}

import stream from 'stream';
import _ from 'lodash';
import { Connection } from '../connection';
import { BaseModel, ColumnPropertyInternal, IndexProperty, ModelSchemaInternal } from '../model';
import { Transaction } from '../transaction';
import * as types from '../types';
import {
  AdapterBase,
  AdapterCountOptions,
  AdapterDeleteOptions,
  AdapterFindOptions,
  AdapterUpsertOptions,
  Schemas,
  SchemasIndex,
} from './base';

function _convertValueToObjectID(value: any, key: any) {
  if (value == null) {
    return null;
  }
  try {
    return new mongodb.ObjectID(value);
  } catch (error: any) {
    throw new Error(`'${key}' is not a valid id`);
  }
}

function _objectIdToString(oid: any) {
  return oid.toString();
}

function _buildWhereSingle(property: ColumnPropertyInternal | undefined, key: any, value: any, not_op?: any): any {
  if (property == null) {
    throw new Error(`unknown column '${key}'`);
  }
  const property_type_class = property.type_class;
  const is_objectid = property_type_class === CormoTypesObjectId;
  if (Array.isArray(value)) {
    if (is_objectid) {
      value = value.map((v) => _convertValueToObjectID(v, key));
    }
    if (not_op) {
      value = { $nin: value };
    } else {
      value = { $in: value };
    }
  } else if (typeof value === 'object' && value !== null && Object.keys(value).length === 1) {
    const keys = Object.keys(value);
    const sub_key = keys[0];
    switch (sub_key) {
      case '$not':
        return _buildWhereSingle(property, key, value[sub_key], !not_op);
      case '$gt':
      case '$lt':
      case '$gte':
      case '$lte': {
        let sub_value = value[sub_key];
        if (is_objectid) {
          sub_value = _convertValueToObjectID(sub_value, key);
        } else if (property_type_class === types.Date) {
          sub_value = new Date(sub_value);
        }
        value = _.zipObject([sub_key], [sub_value]);
        if (not_op) {
          value = { $not: value };
        }
        if (key === 'id') {
          key = '_id';
        }
        return _.zipObject([key], [value]);
      }
      case '$ceq':
      case '$cne':
      case '$cgt':
      case '$clt':
      case '$cgte':
      case '$clte': {
        const sub_expr = value[sub_key];
        if (sub_expr.substr(0, 1) === '$') {
          const compare_column = sub_expr.substr(1);
          if (not_op) {
            const op =
              sub_key === '$cgt'
                ? '<='
                : sub_key === '$cgte'
                  ? '<'
                  : sub_key === '$clt'
                    ? '>='
                    : sub_key === '$clte'
                      ? '>'
                      : sub_key === '$ceq'
                        ? '!='
                        : '==';
            return { $where: `this.${key} ${op} this.${compare_column}` };
          } else {
            const op =
              sub_key === '$cgt'
                ? '>'
                : sub_key === '$cgte'
                  ? '>='
                  : sub_key === '$clt'
                    ? '<'
                    : sub_key === '$clte'
                      ? '<='
                      : sub_key === '$ceq'
                        ? '=='
                        : '!=';
            return { $where: `this.${key} ${op} this.${compare_column}` };
          }
        } else {
          throw new Error(`unknown expression '${sub_expr}'`);
        }
        return _.zipObject([key], [value]);
      }
      case '$contains':
        if (Array.isArray(value[sub_key])) {
          value = value[sub_key].map((v: any) => new RegExp(v, 'i'));
          if (not_op) {
            value = { $nin: value };
            not_op = false;
          } else {
            value = { $in: value };
          }
        } else {
          value = new RegExp(value[sub_key], 'i');
        }
        break;
      case '$startswith':
        value = new RegExp('^' + value[sub_key], 'i');
        break;
      case '$endswith':
        value = new RegExp(value[sub_key] + '$', 'i');
        break;
      case '$in':
        if (is_objectid) {
          value[sub_key] = value[sub_key].map((v: any) => _convertValueToObjectID(v, key));
        }
        break;
      default:
        throw new Error(`unknown operator '${sub_key}'`);
    }
    if (not_op) {
      value = { $not: value };
    }
  } else if (_.isRegExp(value)) {
    if (!value.ignoreCase) {
      value = new RegExp(value.source, 'i');
    }
  } else {
    if (is_objectid) {
      value = _convertValueToObjectID(value, key);
    }
    if (not_op) {
      value = { $ne: value };
    }
  }
  if (key === 'id') {
    key = '_id';
  }
  if (property_type_class === types.Date) {
    value = new Date(value);
  }
  return _.zipObject([!property.primary_key ? property._dbname_dot : key], [value]);
}

function _buildWhere(
  schema: ModelSchemaInternal,
  conditions: Array<Record<string, any>> | Record<string, any>,
  conjunction = '$and',
): Record<string, any> | undefined {
  let subs: Array<Record<string, any> | undefined>;
  if (Array.isArray(conditions)) {
    subs = conditions.map((condition) => _buildWhere(schema, condition));
  } else if (typeof conditions === 'object') {
    const keys = Object.keys(conditions);
    if (keys.length === 0) {
      return;
    } else if (keys.length === 1) {
      const key = keys[0];
      if (key.substr(0, 1) === '$') {
        switch (key) {
          case '$and':
            return _buildWhere(schema, conditions[key], '$and');
          case '$or':
            return _buildWhere(schema, conditions[key], '$or');
        }
        return;
      } else {
        return _buildWhereSingle(schema[key], key, conditions[key]);
      }
    } else {
      subs = keys.map((key) => _buildWhereSingle(schema[key], key, conditions[key]));
    }
  } else {
    throw new Error(`'${JSON.stringify(conditions)}' is not an object`);
  }
  if (subs.length === 0) {
    //
  } else if (subs.length === 1) {
    return subs[0];
  } else {
    if (conjunction === '$and') {
      const before_count = _.reduce(
        subs,
        (memo, sub) => {
          return memo + Object.keys(sub || {}).length;
        },
        0,
      );
      const obj: any = _.extend({}, ...subs);
      const keys = Object.keys(obj);
      const after_count = keys.length;
      if (before_count === after_count && !_.some(keys, (key) => key.substr(0, 1) === '$')) {
        return obj;
      }
    }
    return _.zipObject([conjunction], [subs]);
  }
}

function _buildGroupExpr(schema: ModelSchemaInternal, group_expr: any) {
  let op = Object.keys(group_expr)[0];
  const sub_expr = group_expr[op];
  if (op === '$any') {
    op = '$first';
  }
  if (typeof sub_expr === 'string' && sub_expr.substr(0, 1) === '$') {
    let column = sub_expr.substr(1);
    column = schema[column]?._dbname_us || column;
    return { [op]: `$${column}` };
  } else {
    return { [op]: sub_expr };
  }
}

function _buildGroupFields(model_class: typeof BaseModel, group_by: any, group_fields: any) {
  const group: any = {};
  if (group_by) {
    if (group_by.length === 1) {
      group._id = '$' + group_by[0];
    } else {
      group._id = {};
      group_by.forEach((field: any) => (group._id[field] = '$' + field));
    }
  } else {
    group._id = null;
  }
  for (const field in group_fields) {
    const expr = group_fields[field];
    group[field] = _buildGroupExpr(model_class._schema, expr);
  }
  return group;
}

function _processSaveError(error: any) {
  if (error && (error.code === 11001 || error.code === 11000)) {
    let key = error.message.match(/collection: [\w-.]+ index: (\w+)/);
    if (!key) {
      key = error.message.match(/index: [\w-.]+\$(\w+)(_1)?/);
    }
    return new Error('duplicated ' + (key && key[1]));
  } else {
    return AdapterBase.wrapError('unknown error', error);
  }
}

function _getMongoDBColName(name: any) {
  // there is a problem with name begins with underscore
  if (name === '_archives') {
    return '@archives';
  } else {
    return name;
  }
}

// Adapter for MongoDB
// @namespace adapter
export class MongoDBAdapter extends AdapterBase {
  /** @internal */
  public key_type: any = types.String;

  /** @internal */
  public key_type_internal = CormoTypesObjectId;

  /** @internal */
  public support_geopoint = true;

  /** @internal */
  public support_nested = true;

  /** @internal */
  private _collections: any;
  /** @internal */
  private _db: any;
  /** @internal */
  private _client: any;

  // Creates a MongoDB adapter
  /** @internal */
  constructor(connection: Connection) {
    super();
    this._connection = connection;
    this._collections = {};
  }

  /** @internal */
  public async getSchemas(): Promise<Schemas> {
    const tables = await this._getTables();
    const table_schemas: { [table_name: string]: 'NO SCHEMA' } = {};
    const all_indexes: { [table_name: string]: SchemasIndex } = {};
    for (const table of tables) {
      table_schemas[table] = await this._getSchema(table);
      all_indexes[table] = await this._getIndexes(table);
    }
    return {
      indexes: all_indexes,
      tables: table_schemas,
    };
  }

  /** @internal */
  public async createTable(model_name: string) {
    const collection = this._collection(model_name);
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return;
    }
    const schema = model_class._schema;

    await this._db.createCollection(_getMongoDBColName(model_class.table_name));

    const indexes: any[] = [];
    for (const column in schema) {
      const property = schema[column];
      if (property?.type_class === types.GeoPoint) {
        indexes.push([_.zipObject([column], ['2d'])]);
      }
    }
    for (const index of indexes) {
      await collection.createIndex(index[0], index[1]);
    }
  }

  /** @internal */
  public async createIndex(model_name: string, index: IndexProperty) {
    const collection = this._collection(model_name);
    const options = {
      name: index.options.name,
      sparse: false,
      unique: index.options.unique,
    };
    if (index.options.unique && !index.options.required) {
      options.sparse = true;
    }
    try {
      await collection.createIndex(index.columns, options);
    } catch (error: any) {
      throw MongoDBAdapter.wrapError('unknown error', error);
    }
  }

  /** @internal */
  public async drop(model_name: string) {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return;
    }
    const name = model_class.table_name;
    delete this._collections[name];
    try {
      await this._db.dropCollection(_getMongoDBColName(name));
    } catch (error: any) {
      // ignore not found error
      if (error && error.errmsg !== 'ns not found') {
        throw MongoDBAdapter.wrapError('unknown error', error);
      }
    }
  }

  /** @internal */
  public idToDB(value: any) {
    return _convertValueToObjectID(value, 'id');
  }

  /** @internal */
  public valueToDB(value: any, column: any, property: any) {
    if (value == null) {
      return;
    }
    // convert id type
    if (column === 'id' || property.type_class === CormoTypesObjectId) {
      if (property.array) {
        return value.map((v: any) => v && _convertValueToObjectID(v, column));
      } else {
        return _convertValueToObjectID(value, column);
      }
    }
    return value;
  }

  /** @internal */
  public async create(model_name: string, data: any, options: { transaction?: Transaction; use_id_in_data?: boolean }) {
    let result: any;
    try {
      if (options.use_id_in_data) {
        result = await this._collection(model_name).insertOne({ ...data, _id: data.id }, { safe: true });
      } else {
        result = await this._collection(model_name).insertOne(data, { safe: true });
      }
    } catch (error: any) {
      throw _processSaveError(error);
    }
    const id = _objectIdToString(result.insertedId);
    if (id) {
      delete data._id;
      return id;
    } else {
      throw new Error('unexpected result');
    }
  }

  /** @internal */
  public async createBulk(
    model_name: string,
    data: any[],
    options: { transaction?: Transaction; use_id_in_data?: boolean },
  ) {
    if (data.length > 1000) {
      const chunks = [];
      let i = 0;
      while (i < data.length) {
        chunks.push(data.slice(i, i + 1000));
        i += 1000;
      }
      const ids_all: any = [];
      for (const chunk of chunks) {
        [].push.apply(ids_all, await this.createBulk(model_name, chunk, options));
      }
      return ids_all;
    }
    let result: any;
    try {
      if (options.use_id_in_data) {
        result = await this._collection(model_name).insertMany(
          data.map((item) => ({ ...item, _id: item.id })),
          { safe: true },
        );
      } else {
        result = await this._collection(model_name).insertMany(data, { safe: true });
      }
    } catch (e: any) {
      throw _processSaveError(e);
    }
    let error: Error | undefined;
    const ids = Object.values(result.insertedIds).map((inserted_id: any) => {
      const id = _objectIdToString(inserted_id);
      if (!id) {
        error = new Error('unexpected result');
      }
      return id;
    });
    if (error) {
      throw error;
    } else {
      return ids;
    }
  }

  /** @internal */
  public async update(model_name: string, data: any, _options: { transaction?: Transaction }) {
    const id = data.id;
    delete data.id;
    try {
      await this._collection(model_name).replaceOne({ _id: id }, data, { safe: true });
    } catch (error: any) {
      throw _processSaveError(error);
    }
  }

  /** @internal */
  public async updatePartial(
    model_name: string,
    data: any,
    conditions_arg: Array<Record<string, any>>,
    _options: { transaction?: Transaction },
  ): Promise<number> {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return 0;
    }
    const schema = model_class._schema;
    let conditions = _buildWhere(schema, conditions_arg);
    if (!conditions) {
      conditions = {};
    }
    const update_ops: any = {
      $inc: {},
      $set: {},
      $unset: {},
    };
    this._buildUpdateOps(schema, update_ops, data, '', data);
    if (Object.keys(update_ops.$set).length === 0) {
      delete update_ops.$set;
    }
    if (Object.keys(update_ops.$unset).length === 0) {
      delete update_ops.$unset;
    }
    if (Object.keys(update_ops.$inc).length === 0) {
      delete update_ops.$inc;
    }
    try {
      const result = await this._collection(model_name).updateMany(conditions, update_ops, { safe: true, multi: true });
      return result.modifiedCount;
    } catch (error: any) {
      throw _processSaveError(error);
    }
  }

  /** @internal */
  public async upsert(
    model_name: string,
    data: any,
    conditions_arg: Array<Record<string, any>>,
    options: AdapterUpsertOptions,
  ) {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return;
    }
    const schema = model_class._schema;
    let conditions = _buildWhere(schema, conditions_arg);
    if (!conditions) {
      conditions = {};
    }
    const update_ops: any = {
      $set: {},
      $setOnInsert: {},
      $unset: {},
      $inc: {},
    };
    for (const key in conditions) {
      const value = conditions[key];
      update_ops.$set[key] = value;
    }
    this._buildUpdateOps(schema, update_ops, data, '', data, options.ignore_on_update);
    if (Object.keys(update_ops.$set).length === 0) {
      delete update_ops.$set;
    }
    if (Object.keys(update_ops.$setOnInsert).length === 0) {
      delete update_ops.$setOnInsert;
    }
    if (Object.keys(update_ops.$unset).length === 0) {
      delete update_ops.$unset;
    }
    if (Object.keys(update_ops.$inc).length === 0) {
      delete update_ops.$inc;
    }
    try {
      await this._collection(model_name).updateMany(conditions, update_ops, { safe: true, upsert: true });
    } catch (error: any) {
      throw _processSaveError(error);
    }
  }

  /** @internal */
  public async findById(
    model_name: string,
    id: any,
    options: { select?: string[]; explain?: boolean; transaction?: Transaction },
  ): Promise<any> {
    const fields = this._buildSelect(options.select);
    try {
      id = _convertValueToObjectID(id, 'id');
    } catch (error: any) {
      throw new Error('not found');
    }
    const client_options: any = {};
    if (fields) {
      client_options.projection = fields;
    }
    if (options.explain) {
      client_options.explain = true;
      return await this._collection(model_name).findOne({ _id: id }, client_options);
    }
    let result: any;
    try {
      result = await this._collection(model_name).findOne({ _id: id }, client_options);
    } catch (error: any) {
      throw MongoDBAdapter.wrapError('unknown error', error);
    }
    if (!result) {
      throw new Error('not found');
      return;
    }
    return this._convertToModelInstance(model_name, result, options);
  }

  /** @internal */
  public async find(
    model_name: string,
    conditions_arg: Array<Record<string, any>>,
    options: AdapterFindOptions,
  ): Promise<any> {
    const [conditions, , orders, client_options] = this._buildConditionsForFind(model_name, conditions_arg, options);
    // console.log(JSON.stringify(conditions));
    if (options.group_by || options.group_fields) {
      const model_class = this._connection.models[model_name];
      if (!model_class) {
        throw new Error('model not found');
      }
      const pipeline: any[] = [];
      if (conditions) {
        pipeline.push({ $match: conditions });
      }
      pipeline.push({ $group: _buildGroupFields(model_class, options.group_by, options.group_fields) });
      if (orders) {
        pipeline.push({ $sort: orders });
      }
      if (options.conditions_of_group.length > 0) {
        pipeline.push({ $match: _buildWhere(options.group_fields, options.conditions_of_group) });
      }
      if (options.limit) {
        pipeline.push({ $limit: options.limit });
      }
      if (options.explain) {
        const cursor = await this._collection(model_name).aggregate(pipeline, { explain: true });
        return await cursor.toArray();
      }
      let result: any;
      try {
        const cursor = await this._collection(model_name).aggregate(pipeline);
        result = await cursor.toArray();
      } catch (error: any) {
        throw MongoDBAdapter.wrapError('unknown error', error);
      }
      return result.map((record: any) => {
        if (options.group_by) {
          if (options.group_by.length === 1) {
            record[options.group_by[0]] = record._id;
          } else {
            for (const group of options.group_by) {
              record[group] = record._id[group];
            }
          }
        }
        return this._convertToGroupInstance(
          model_name,
          record,
          options.group_by,
          options.group_fields,
          model_class.query_record_id_as_string,
        );
      });
    } else {
      if (options.explain) {
        client_options.explain = true;
        const cursor = await this._collection(model_name).find(conditions, client_options);
        return await cursor.toArray();
      }
      let result: any;
      try {
        const cursor = await this._collection(model_name).find(conditions, client_options);
        if (!cursor) {
          throw new Error('no cursor');
        }
        result = await cursor.toArray();
      } catch (error: any) {
        throw MongoDBAdapter.wrapError('unknown error', error);
      }
      return result.map((record: any) => {
        return this._convertToModelInstance(model_name, record, options);
      });
    }
  }

  /** @internal */
  public stream(model_name: string, conditions_arg: Array<Record<string, any>>, options: AdapterFindOptions) {
    try {
      const [conditions, , , client_options] = this._buildConditionsForFind(model_name, conditions_arg, options);
      const transformer = new stream.Transform({ objectMode: true });
      transformer._transform = (record, encoding, callback) => {
        transformer.push(this._convertToModelInstance(model_name, record, options));
        callback();
      };
      try {
        const cursor = this._collection(model_name).find(conditions, client_options).stream();
        cursor
          .on('error', (e: any) => {
            transformer.emit('error', e);
          })
          .pipe(transformer);
      } catch (error: any) {
        transformer.emit('error', MongoDBAdapter.wrapError('unknown error', error));
      }
      return transformer;
    } catch (e: any) {
      const readable = new stream.Readable({ objectMode: true });
      readable._read = () => {
        readable.emit('error', e);
      };
      return readable;
    }
  }

  /** @internal */
  public async count(
    model_name: string,
    conditions_arg: Array<Record<string, any>>,
    options: AdapterCountOptions,
  ): Promise<number> {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return 0;
    }
    const conditions = _buildWhere(model_class._schema, conditions_arg);
    // console.log(JSON.stringify(conditions))
    if (options.group_by || options.group_fields) {
      const pipeline = [];
      if (conditions) {
        pipeline.push({ $match: conditions });
      }
      pipeline.push({ $group: _buildGroupFields(model_class, options.group_by, options.group_fields) });
      if (options.conditions_of_group.length > 0) {
        pipeline.push({ $match: _buildWhere(options.group_fields, options.conditions_of_group) });
      }
      pipeline.push({ $group: { _id: null, count: { $sum: 1 } } });
      let result: any;
      try {
        const cursor = await this._collection(model_name).aggregate(pipeline);
        result = await cursor.toArray();
        if (!result || result.length !== 1) {
          throw new Error('invalid result');
        }
      } catch (error: any) {
        throw MongoDBAdapter.wrapError('unknown error', error);
      }
      return result[0].count;
    } else {
      try {
        const count = await this._collection(model_name).countDocuments(conditions);
        return count;
      } catch (error: any) {
        throw MongoDBAdapter.wrapError('unknown error', error);
      }
    }
  }

  /** @internal */
  public async delete(
    model_name: string,
    conditions_arg: Array<Record<string, any>>,
    options: AdapterDeleteOptions,
  ): Promise<number> {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return 0;
    }
    if (options.orders.length > 0 || options.limit || options.skip) {
      const [conditions_find, , , client_options] = this._buildConditionsForFind(model_name, conditions_arg, {
        ...options,
        lean: true,
        joins: [],
        conditions_of_group: [],
      });
      const cursor = await this._collection(model_name).find(conditions_find, {
        ...client_options,
        projection: { _id: 1 },
      });
      const records = await cursor.toArray();
      const ids = records.map(this._getModelID);
      conditions_arg = [{ id: { $in: ids } }];
    }
    const conditions = _buildWhere(model_class._schema, conditions_arg);
    try {
      // console.log(JSON.stringify(conditions))
      const result = await this._collection(model_name).deleteMany(conditions, { safe: true });
      return result.deletedCount;
    } catch (error: any) {
      throw MongoDBAdapter.wrapError('unknown error', error);
    }
  }

  /**
   * Connects to the database
   * @internal
   */
  public async connect(settings: AdapterSettingsMongoDB) {
    let url;
    const host = settings.host || 'localhost';
    const port = settings.port || 27017;
    const user = await settings.user;
    const password = await settings.password;
    if (user || password) {
      url = `mongodb://${user}:${password}@${host}:${port}/${settings.database}`;
    } else {
      url = `mongodb://${host}:${port}/${settings.database}`;
    }
    try {
      const client = await mongodb.MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
      this._client = client;
      this._db = client.db(settings.database);
    } catch (error: any) {
      throw MongoDBAdapter.wrapError('unknown error', error);
    }
  }

  /** @internal */
  public close() {
    if (this._client) {
      this._client.close();
    }
    this._client = null;
    return (this._db = null);
  }

  /**
   * Exposes mongodb module's a collection object
   */
  public collection(model_name: string) {
    return this._collection(model_name);
  }

  /** @internal */
  protected _getModelID(data: any) {
    if (!data._id) {
      return null;
    }
    return _objectIdToString(data._id);
  }

  /** @internal */
  protected valueToModel(value: any, property: ColumnPropertyInternal, _query_record_id_as_string: boolean) {
    if (property.type_class === CormoTypesObjectId) {
      if (property.array) {
        return value.map((v: any) => v && _objectIdToString(v));
      } else {
        return value && _objectIdToString(value);
      }
    } else {
      return value;
    }
  }

  /** @internal */
  private _buildSelect(select?: string[]) {
    if (select) {
      const fields: any = {};
      select.forEach((column: any) => {
        if (column !== 'id') {
          fields[column] = 1;
        }
      });
      if (!select.includes('id')) {
        fields._id = 0;
      }
      return fields;
    }
  }

  /** @internal */
  private _collection(model_name: string): any {
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return;
    }
    const name = model_class.table_name;
    if (!this._collections[name]) {
      return (this._collections[name] = this._db.collection(_getMongoDBColName(name)));
    } else {
      return this._collections[name];
    }
  }

  /** @internal */
  private async _getTables(): Promise<string[]> {
    const collections = await this._db.listCollections().toArray();
    const tables = collections.map((collection: any) => collection.name);
    return tables;
  }

  /** @internal */
  private async _getSchema(_table: string): Promise<'NO SCHEMA'> {
    return Promise.resolve('NO SCHEMA');
  }

  /** @internal */
  private async _getIndexes(table: string): Promise<SchemasIndex> {
    const rows = await this._db.collection(table).listIndexes().toArray();
    const indexes: any = {};
    for (const row of rows) {
      if (row.name === '_id_') {
        continue;
      }
      indexes[row.name] = row.key;
    }
    return indexes;
  }

  /** @internal */
  private _buildUpdateOps(
    schema: ModelSchemaInternal,
    update_ops: any,
    data: any,
    path: any,
    object: any,
    ignore_on_update?: string[],
  ): any {
    for (const column in object) {
      const value = object[column];
      const property = _.find(schema, { _dbname_dot: path + column });
      if (property) {
        if (property.primary_key) {
          continue;
        }
        if (value != null) {
          if (value.$inc != null) {
            if (ignore_on_update?.includes(column)) {
              update_ops.$setOnInsert[path + column] = value.$inc;
            } else {
              update_ops.$inc[path + column] = value.$inc;
            }
          } else {
            if (ignore_on_update?.includes(column)) {
              update_ops.$setOnInsert[path + column] = value;
            } else {
              update_ops.$set[path + column] = value;
            }
          }
        } else {
          update_ops.$unset[path + column] = '';
        }
      } else if (typeof object[column] === 'object') {
        this._buildUpdateOps(schema, update_ops, data, path + column + '.', object[column]);
      }
    }
  }

  /** @internal */
  private _buildConditionsForFind(
    model_name: string,
    conditions_arg: Array<Record<string, any>>,
    options: AdapterFindOptions,
  ): [Record<string, any> | undefined, any, any, any] {
    const fields = this._buildSelect(options.select);
    let orders: any;
    const model_class = this._connection.models[model_name];
    if (!model_class) {
      return [undefined, undefined, undefined, {}];
    }
    let conditions = _buildWhere(model_class._schema, conditions_arg);
    if (options.near != null && Object.keys(options.near)[0]) {
      const field = Object.keys(options.near)[0];
      let keys: any;
      if (conditions) {
        // MongoDB fails if $near is mixed with $and
        keys = Object.keys(conditions);
      }
      if (keys && (keys.length > 1 || keys[0].substr(0, 1) !== '$')) {
        conditions![field] = { $near: options.near[field] };
      } else {
        const obj: any = {};
        obj[field] = { $near: options.near[field] };
        if (conditions) {
          conditions = { $and: [conditions, obj] };
        } else {
          conditions = obj;
        }
      }
    }
    if (options.orders.length > 0) {
      orders = {};
      options.orders.forEach((order: any) => {
        let column: any;
        let dir: any;
        if (order[0] === '-') {
          column = order.slice(1);
          dir = -1;
        } else {
          column = order;
          dir = 1;
        }
        if (options.group_by) {
          if (options.group_by.length === 1) {
            if (column === options.group_by[0]) {
              column = '_id';
            }
          } else {
            if (options.group_by.indexOf(column) >= 0) {
              column = '_id.' + column;
            }
          }
        } else {
          if (column === 'id') {
            column = '_id';
          }
        }
        orders[column] = dir;
        return;
      });
    }
    const client_options: any = {
      limit: options.limit,
      skip: options.skip,
    };
    if (fields) {
      client_options.projection = fields;
    }
    if (orders) {
      client_options.sort = orders;
    }
    return [conditions, fields, orders, client_options];
  }
}

export function createAdapter(connection: Connection) {
  if (!mongodb) {
    console.log('Install mongodb module to use this adapter');
    process.exit(1);
  }
  return new MongoDBAdapter(connection);
}
