// tslint:disable:max-classes-per-file

let mongodb: any;

try {
  // tslint:disable-next-line:no-var-requires
  mongodb = require('mongodb');
} catch (error) {
  console.log('Install mongodb module to use this adapter');
  process.exit(1);
}

const ObjectID = mongodb.ObjectID;

export interface IAdapterSettingsMongoDB {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database: string;
}

class CormoTypesObjectId { }

import * as _ from 'lodash';
import * as stream from 'stream';
import { IColumnPropertyInternal, IModelSchemaInternal } from '../model';
import { Transaction } from '../transaction';
import * as types from '../types';
import { AdapterBase, IAdapterCountOptions, IAdapterFindOptions, ISchemas } from './base';

function _convertValueToObjectID(value: any, key: any) {
  if (value == null) {
    return null;
  }
  try {
    return new ObjectID(value);
  } catch (error) {
    throw new Error(`'${key}' is not a valid id`);
  }
}

function _objectIdToString(oid: any) {
  return oid.toString();
}

function _buildWhereSingle(property: IColumnPropertyInternal, key: any, value: any, not_op?: any): any {
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
      case '$lte':
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

function _buildWhere(schema: IModelSchemaInternal, conditions: any, conjunction = '$and'): any {
  let subs: any;
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
      const before_count = _.reduce(subs, (memo, sub) => {
        return memo + Object.keys(sub).length;
      }, 0);
      subs.unshift({});
      const obj = _.extend.apply(_, subs);
      subs.shift();
      const keys = Object.keys(obj);
      const after_count = keys.length;
      if (before_count === after_count && !_.some(keys, (key) => key.substr(0, 1) === '$')) {
        return obj;
      }
    }
    return _.zipObject([conjunction], [subs]);
  }
}

function _buildGroupFields(group_by: any, group_fields: any) {
  const group: any = {};
  if (group_by) {
    if (group_by.length === 1) {
      group._id = '$' + group_by[0];
    } else {
      group._id = {};
      group_by.forEach((field: any) => group._id[field] = '$' + field);
    }
  } else {
    group._id = null;
  }
  // tslint:disable-next-line:forin
  for (const field in group_fields) {
    const expr = group_fields[field];
    group[field] = expr;
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
    return MongoDBAdapter.wrapError('unknown error', error);
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
class MongoDBAdapter extends AdapterBase {
  public key_type: any = types.String;

  public key_type_internal = CormoTypesObjectId;

  public support_geopoint = true;

  public support_nested = true;

  private _collections: any;
  private _db: any;
  private _client: any;

  // Creates a MongoDB adapter
  constructor(connection: any) {
    super();
    this._connection = connection;
    this._collections = {};
  }

  public async getSchemas(): Promise<ISchemas> {
    const tables = await this._getTables();
    const table_schemas: any = {};
    const all_indexes: any = {};
    for (const table of tables) {
      table_schemas[table] = await this._getSchema(table);
      all_indexes[table] = await this._getIndexes(table);
    }
    return {
      indexes: all_indexes,
      tables: table_schemas,
    };
  }

  public async createTable(model: any) {
    const collection = this._collection(model);
    const model_class = this._connection.models[model];
    const schema = model_class._schema;

    await this._db.createCollection(_getMongoDBColName(model_class.table_name));

    const indexes: any[] = [];
    // tslint:disable-next-line:forin
    for (const column in schema) {
      const property = schema[column];
      if (property.type_class === types.GeoPoint) {
        indexes.push([_.zipObject([column], ['2d'])]);
      }
    }
    for (const index of indexes) {
      await collection.createIndex(index[0], index[1]);
    }
  }

  public async createIndex(model: any, index: any) {
    const collection = this._collection(model);
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
    } catch (error) {
      throw MongoDBAdapter.wrapError('unknown error', error);
    }
  }

  public async drop(model: any) {
    const name = this._connection.models[model].table_name;
    delete this._collections[name];
    try {
      await this._db.dropCollection(_getMongoDBColName(name));
    } catch (error) {
      // ignore not found error
      if (error && error.errmsg !== 'ns not found') {
        throw MongoDBAdapter.wrapError('unknown error', error);
      }
    }
  }

  public idToDB(value: any) {
    return _convertValueToObjectID(value, 'id');
  }

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

  public async create(model: string, data: any, options: { transaction?: Transaction }) {
    let result: any;
    try {
      result = await this._collection(model).insertOne(data, { safe: true });
    } catch (error) {
      throw _processSaveError(error);
    }
    const id = _objectIdToString(result.ops[0]._id);
    if (id) {
      delete data._id;
      return id;
    } else {
      throw new Error('unexpected result');
    }
  }

  public async createBulk(model: string, data: any[], options: { transaction?: Transaction }) {
    if (data.length > 1000) {
      const chunks = [];
      let i = 0;
      while (i < data.length) {
        chunks.push(data.slice(i, i + 1000));
        i += 1000;
      }
      const ids_all: any = [];
      for (const chunk of chunks) {
        [].push.apply(ids_all, await this.createBulk(model, chunk, options));
      }
      return ids_all;
    }
    let result: any;
    try {
      result = (await this._collection(model).insertMany(data, { safe: true }));
    } catch (error) {
      throw _processSaveError(error);
    }
    let error;
    const ids = result.ops.map((doc: any) => {
      const id = _objectIdToString(doc._id);
      if (id) {
        delete doc._id;
      } else {
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

  public async update(model: any, data: any, options: { transaction?: Transaction }) {
    const id = data.id;
    delete data.id;
    try {
      await this._collection(model).replaceOne({ _id: id }, data, { safe: true });
    } catch (error) {
      throw _processSaveError(error);
    }
  }

  public async updatePartial(
    model: string, data: any, conditions: any,
    options: { transaction?: Transaction },
  ): Promise<number> {
    const schema = this._connection.models[model]._schema;
    conditions = _buildWhere(schema, conditions);
    if (!conditions) {
      conditions = {};
    }
    const update_ops = {
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
      const result = await this._collection(model).updateMany(conditions, update_ops, { safe: true, multi: true });
      return result.result.n;
    } catch (error) {
      throw _processSaveError(error);
    }
  }

  public async upsert(model: any, data: any, conditions: any, options: any) {
    const schema = this._connection.models[model]._schema;
    conditions = _buildWhere(schema, conditions);
    if (!conditions) {
      conditions = {};
    }
    const update_ops: any = {
      $inc: {},
      $set: {},
      $unset: {},
    };
    // tslint:disable-next-line:forin
    for (const key in conditions) {
      const value = conditions[key];
      update_ops.$set[key] = value;
    }
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
      await this._collection(model).updateMany(conditions, update_ops, { safe: true, upsert: true });
    } catch (error) {
      throw _processSaveError(error);
    }
  }

  public async findById(
    model: string, id: any,
    options: { select?: string[], explain?: boolean, transaction?: Transaction },
  ): Promise<any> {
    const fields = this._buildSelect(options.select);
    try {
      id = _convertValueToObjectID(id, 'id');
    } catch (error) {
      throw new Error('not found');
    }
    const client_options: any = {};
    if (fields) {
      client_options.projection = fields;
    }
    if (options.explain) {
      client_options.explain = true;
      return await this._collection(model).findOne({ _id: id }, client_options);
    }
    let result: any;
    try {
      result = await this._collection(model).findOne({ _id: id }, client_options);
    } catch (error) {
      throw MongoDBAdapter.wrapError('unknown error', error);
    }
    if (!result) {
      throw new Error('not found');
      return;
    }
    return this._convertToModelInstance(model, result, options);
  }

  public async find(model: string, conditions: any, options: IAdapterFindOptions): Promise<any> {
    let fields: any;
    let orders: any;
    let client_options: any;
    [conditions, fields, orders, client_options] = this._buildConditionsForFind(model, conditions, options);
    // console.log(JSON.stringify(conditions));
    if (options.group_by || options.group_fields) {
      const pipeline: any[] = [];
      if (conditions) {
        pipeline.push({ $match: conditions });
      }
      pipeline.push({ $group: _buildGroupFields(options.group_by, options.group_fields) });
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
        const cursor = await this._collection(model).aggregate(pipeline, { explain: true });
        return await cursor.toArray();
      }
      let result: any;
      try {
        const cursor = await this._collection(model).aggregate(pipeline);
        result = await cursor.toArray();
      } catch (error) {
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
        return this._convertToGroupInstance(model, record, options.group_by, options.group_fields);
      });
    } else {
      if (options.explain) {
        client_options.explain = true;
        const cursor = await this._collection(model).find(conditions, client_options);
        return await cursor.toArray();
      }
      let result: any;
      try {
        const cursor = await this._collection(model).find(conditions, client_options);
        if (!cursor) {
          throw new Error('no cursor');
        }
        result = await cursor.toArray();
      } catch (error) {
        throw MongoDBAdapter.wrapError('unknown error', error);
      }
      return result.map((record: any) => {
        return this._convertToModelInstance(model, record, options);
      });
    }
  }

  public stream(model: any, conditions: any, options: any) {
    let fields: any;
    let orders: any;
    let client_options: any;
    try {
      [conditions, fields, orders, client_options] = this._buildConditionsForFind(model, conditions, options);
    } catch (e) {
      const readable = new stream.Readable({ objectMode: true });
      readable._read = () => {
        readable.emit('error', e);
      };
      return readable;
    }
    const transformer = new stream.Transform({ objectMode: true });
    transformer._transform = (record, encoding, callback) => {
      transformer.push(this._convertToModelInstance(model, record, options));
      callback();
    };
    this._collection(model).find(conditions, client_options, (error: any, cursor: any) => {
      if (error || !cursor) {
        transformer.emit('error', MongoDBAdapter.wrapError('unknown error', error));
        return;
      }
      cursor.on('error', (e: any) => {
        transformer.emit('error', e);
      }).pipe(transformer);
    });
    return transformer;
  }

  public async count(model: string, conditions: any, options: IAdapterCountOptions): Promise<number> {
    conditions = _buildWhere(this._connection.models[model]._schema, conditions);
    // console.log(JSON.stringify(conditions))
    if (options.group_by || options.group_fields) {
      const pipeline = [];
      if (conditions) {
        pipeline.push({ $match: conditions });
      }
      pipeline.push({ $group: _buildGroupFields(options.group_by, options.group_fields) });
      if (options.conditions_of_group.length > 0) {
        pipeline.push({ $match: _buildWhere(options.group_fields, options.conditions_of_group) });
      }
      pipeline.push({ $group: { _id: null, count: { $sum: 1 } } });
      let result: any;
      try {
        const cursor = await this._collection(model).aggregate(pipeline);
        result = await cursor.toArray();
        if (!result || result.length !== 1) {
          throw new Error('invalid result');
        }
      } catch (error) {
        throw MongoDBAdapter.wrapError('unknown error', error);
      }
      return result[0].count;
    } else {
      try {
        const count = await this._collection(model).countDocuments(conditions);
        return count;
      } catch (error) {
        throw MongoDBAdapter.wrapError('unknown error', error);
      }
    }
  }

  public async delete(model: string, conditions: any, options: { transaction?: Transaction }): Promise<number> {
    const model_class = this._connection.models[model];
    conditions = _buildWhere(model_class._schema, conditions);
    try {
      // console.log(JSON.stringify(conditions))
      const result = await this._collection(model).deleteMany(conditions, { safe: true });
      return result.result.n;
    } catch (error) {
      throw MongoDBAdapter.wrapError('unknown error', error);
    }
  }

  /**
   * Connects to the database
   */
  public async connect(settings: IAdapterSettingsMongoDB) {
    let url;
    if (settings.user || settings.password) {
      const host = settings.host || 'localhost';
      const port = settings.port || 27017;
      url = `mongodb://${settings.user}:${settings.password}@${host}:${port}/${settings.database}`;
    } else {
      url = `mongodb://${settings.host || 'localhost'}:${settings.port || 27017}/${settings.database}`;
    }
    try {
      const client = await mongodb.MongoClient.connect(url, { useNewUrlParser: true });
      this._client = client;
      this._db = client.db(settings.database);
    } catch (error) {
      throw MongoDBAdapter.wrapError('unknown error', error);
    }
  }

  public close() {
    if (this._client) {
      this._client.close();
    }
    this._client = null;
    return this._db = null;
  }

  /**
   * Exposes mongodb module's a collection object
   */
  public collection(model: any) {
    return this._collection(model);
  }

  protected _getModelID(data: any) {
    if (!data._id) {
      return null;
    }
    return _objectIdToString(data._id);
  }

  protected valueToModel(value: any, property: any) {
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

  private _collection(model: any): any {
    const name = this._connection.models[model].table_name;
    if (!this._collections[name]) {
      return this._collections[name] = this._db.collection(_getMongoDBColName(name));
    } else {
      return this._collections[name];
    }
  }

  private async _getTables() {
    const collections = await this._db.listCollections().toArray();
    const tables = collections.map((collection: any) => collection.name);
    return tables;
  }

  private async _getSchema(table: any) {
    return 'NO SCHEMA';
  }

  private async _getIndexes(table: any) {
    const rows = await this._db.collection(table).listIndexes().toArray();
    const indexes: any = {};
    for (const row of rows) {
      indexes[row.name] = row.key;
    }
    return indexes;
  }

  private _buildUpdateOps(schema: IModelSchemaInternal, update_ops: any, data: any, path: any, object: any): any {
    // tslint:disable-next-line:forin
    for (const column in object) {
      const value = object[column];
      const property = _.find(schema, { _dbname_dot: path + column });
      if (property) {
        if (property.primary_key) {
          continue;
        }
        if (value != null) {
          if (value.$inc != null) {
            update_ops.$inc[path + column] = value.$inc;
          } else {
            update_ops.$set[path + column] = value;
          }
        } else {
          update_ops.$unset[path + column] = '';
        }
      } else if (typeof object[column] === 'object') {
        this._buildUpdateOps(schema, update_ops, data, path + column + '.', object[column]);
      }
    }
  }

  private _buildConditionsForFind(model: any, conditions: any, options: IAdapterFindOptions) {
    const fields = this._buildSelect(options.select);
    let orders: any;
    conditions = _buildWhere(this._connection.models[model]._schema, conditions);
    if (options.near != null && Object.keys(options.near)[0]) {
      const field = Object.keys(options.near)[0];
      let keys: any;
      if (conditions) {
        // MongoDB fails if $near is mixed with $and
        keys = Object.keys(conditions);
      }
      if (keys && (keys.length > 1 || keys[0].substr(0, 1) !== '$')) {
        conditions[field] = { $near: options.near[field] };
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

export default (connection: any) => {
  return new MongoDBAdapter(connection);
};
