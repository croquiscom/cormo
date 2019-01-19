let redis: any;

try {
  // tslint:disable-next-line:no-var-requires
  redis = require('redis');
} catch (error) {
  console.log('Install redis module to use this adapter');
  process.exit(1);
}

export interface IAdapterSettingsRedis {
  host?: string;
  port?: number;
  database: string;
}

import * as _ from 'lodash';
import * as stream from 'stream';
import * as util from 'util';
import { Transaction } from '../transaction';
import * as types from '../types';
import { tableize } from '../util/inflector';
import { AdapterBase } from './base';

// Adapter for Redis
// @namespace adapter
class RedisAdapter extends AdapterBase {
  public support_upsert = false;

  public key_type: any = types.Integer;

  private _client: any;

  // Creates a Redis adapter
  constructor(connection: any) {
    super();
    this._connection = connection;
  }

  public async drop(model: string) {
    await this.delete(model, []);
  }

  public valueToDB(value: any, column: any, property: any) {
    if (value == null) {
      return;
    }
    switch (property.type_class) {
      case types.Number:
      case types.Integer:
        return value.toString();
      case types.Date:
        return new Date(value).getTime().toString();
      case types.Boolean:
        if (value) {
          return '1';
        } else {
          return '0';
        }
        break;
      case types.Object:
        return JSON.stringify(value);
      default:
        return value;
    }
  }

  public async create(model: string, data: any, options: { transaction?: Transaction }): Promise<any> {
    data.$_$ = ''; // ensure that there is one argument(one field) at least
    let id;
    try {
      id = await this._client.incrAsync(`${tableize(model)}:_lastid`);
    } catch (error) {
      throw RedisAdapter.wrapError('unknown error', error);
    }
    try {
      await this._client.hmsetAsync(`${tableize(model)}:${id}`, data);
    } catch (error) {
      throw RedisAdapter.wrapError('unknown error', error);
    }
    return id;
  }

  public async createBulk(model: string, data: any[], options: { transaction?: Transaction }): Promise<any[]> {
    return await this._createBulkDefault(model, data, options);
  }

  public async update(model: string, data: any) {
    const key = `${tableize(model)}:${data.id}`;
    delete data.id;
    data.$_$ = ''; // ensure that there is one argument(one field) at least
    let exists;
    try {
      exists = (await this._client.existsAsync(key));
    } catch (error) {
      throw RedisAdapter.wrapError('unknown error', error);
    }
    if (!exists) {
      return;
    }
    try {
      await this._client.delAsync(key);
    } catch (error) {
      throw RedisAdapter.wrapError('unknown error', error);
    }
    try {
      await this._client.hmsetAsync(key, data);
    } catch (error) {
      throw RedisAdapter.wrapError('unknown error', error);
    }
  }

  public async updatePartial(model: string, data: any, conditions: any, options: any): Promise<number> {
    const fields_to_del = Object.keys(data).filter((key) => data[key] == null);
    fields_to_del.forEach((key) => {
      return delete data[key];
    });
    fields_to_del.push('$_$'); // ensure that there is one argument at least
    const table = tableize(model);
    data.$_$ = ''; // ensure that there is one argument(one field) at least
    const keys = await this._getKeys(table, conditions);
    for (const key of keys) {
      const args = _.clone(fields_to_del);
      args.unshift(key);
      try {
        await this._client.hdelAsync(args);
      } catch (error) {
        throw RedisAdapter.wrapError('unknown error', error);
      }
      try {
        await this._client.hmsetAsync(key, data);
      } catch (error) {
        throw RedisAdapter.wrapError('unknown error', error);
      }
    }
    return keys.length;
  }

  public async upsert(model: string, data: any, conditions: any, options: any): Promise<void> {
    throw new Error('not implemented');
  }

  public async findById(model: any, id: any, options: any): Promise<any> {
    let result;
    try {
      result = (await this._client.hgetallAsync(`${tableize(model)}:${id}`));
    } catch (error) {
      throw RedisAdapter.wrapError('unknown error', error);
    }
    if (result) {
      result.id = id;
      return this._convertToModelInstance(model, result, options);
    } else {
      throw new Error('not found');
    }
  }

  public async find(model: any, conditions: any, options: any): Promise<any> {
    const table = tableize(model);
    const keys = await this._getKeys(table, conditions);
    let records: any[] = await Promise.all(keys.map(async (key: any) => {
      const result = await this._client.hgetallAsync(key);
      if (result) {
        result.id = Number(key.substr(table.length + 1));
      }
      return result;
    }));
    records = records.filter((record) => record != null);
    return records.map((record) => {
      return this._convertToModelInstance(model, record, options);
    });
  }

  public stream(model: any, conditions: any, options: any): stream.Readable {
    throw new Error('not implemented');
  }

  public async count(model: any, conditions: any, options: any): Promise<number> {
    throw new Error('not implemented');
  }

  public async delete(model: any, conditions: any): Promise<number> {
    const keys = await this._getKeys(tableize(model), conditions);
    if (keys.length === 0) {
      return 0;
    }
    let count;
    try {
      count = (await this._client.delAsync(keys));
    } catch (error) {
      throw RedisAdapter.wrapError('unknown error', error);
    }
    return count;
  }

  public close(): void {
    //
  }

  /**
   * Connects to the database
   */
  public async connect(settings: IAdapterSettingsRedis) {
    const methods = ['del', 'exists', 'hdel', 'hgetall', 'hmset', 'incr', 'keys', 'select'];
    this._client = redis.createClient(settings.port || 6379, settings.host || '127.0.0.1');
    for (const method of methods) {
      this._client[method + 'Async'] = util.promisify(this._client[method]);
    }
    return (await this._client.selectAsync(settings.database || 0));
  }

  protected valueToModel(value: any, property: any) {
    switch (property.type_class) {
      case types.Number:
      case types.Integer:
        return Number(value);
      case types.Date:
        return new Date(Number(value));
      case types.Boolean:
        return value !== '0';
      case types.Object:
        return JSON.parse(value);
      default:
        return value;
    }
  }

  private async _getKeys(table: any, conditions: any) {
    if (Array.isArray(conditions)) {
      if (conditions.length === 0) {
        return (await this._client.keysAsync(`${table}:*`));
      }
      const all_keys: any[] = [];
      await Promise.all(conditions.map(async (condition) => {
        const keys = await this._getKeys(table, condition);
        [].push.apply(all_keys, keys);
      }));
      return all_keys;
    } else if (typeof conditions === 'object' && conditions.id) {
      if (conditions.id.$in) {
        return conditions.id.$in.map((id: any) => `${table}:${id}`);
      } else {
        return [`${table}:${conditions.id}`];
      }
    }
    return [];
  }

}

export default (connection: any) => {
  return new RedisAdapter(connection);
};
