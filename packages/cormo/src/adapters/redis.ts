let redis: any;

try {
  redis = require('redis');
} catch (error) {
  //
}

export interface AdapterSettingsRedis {
  host?: string;
  port?: number;
  database: string;
}

import stream from 'stream';
import util from 'util';
import _ from 'lodash';
import { Connection } from '../connection';
import { Transaction } from '../transaction';
import * as types from '../types';
import { tableize } from '../util/inflector';
import { AdapterBase, AdapterCountOptions, AdapterFindOptions, AdapterUpsertOptions } from './base';

// Adapter for Redis
// @namespace adapter
export class RedisAdapter extends AdapterBase {
  /** @internal */
  public support_upsert = false;

  /** @internal */
  public key_type: any = types.Integer;

  /** @internal */
  private _client: any;

  // Creates a Redis adapter
  /** @internal */
  constructor(connection: Connection) {
    super();
    this._connection = connection;
  }

  /** @internal */
  public async drop(model: string) {
    await this.delete(model, [], {});
  }

  /** @internal */
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

  /** @internal */
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

  /** @internal */
  public async createBulk(model: string, data: any[], options: { transaction?: Transaction }): Promise<any[]> {
    return await this._createBulkDefault(model, data, options);
  }

  /** @internal */
  public async update(model: string, data: any, options: { transaction?: Transaction }) {
    const key = `${tableize(model)}:${data.id}`;
    delete data.id;
    data.$_$ = ''; // ensure that there is one argument(one field) at least
    let exists;
    try {
      exists = await this._client.existsAsync(key);
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

  /** @internal */
  public async updatePartial(
    model: string,
    data: any,
    conditions: any,
    options: { transaction?: Transaction },
  ): Promise<number> {
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

  /** @internal */
  public async upsert(model: string, data: any, conditions: any, options: AdapterUpsertOptions): Promise<void> {
    return Promise.reject(new Error('not implemented'));
  }

  /** @internal */
  public async findById(
    model: string,
    id: any,
    options: { select?: string[]; explain?: boolean; transaction?: Transaction },
  ): Promise<any> {
    let result;
    try {
      result = await this._client.hgetallAsync(`${tableize(model)}:${id}`);
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

  /** @internal */
  public async find(model: string, conditions: any, options: AdapterFindOptions): Promise<any> {
    const table = tableize(model);
    const keys = await this._getKeys(table, conditions);
    let records: any[] = await Promise.all(
      keys.map(async (key: any) => {
        const result = await this._client.hgetallAsync(key);
        if (result) {
          result.id = Number(key.substr(table.length + 1));
        }
        return result;
      }),
    );
    records = records.filter((record) => record != null);
    return records.map((record) => {
      return this._convertToModelInstance(model, record, options);
    });
  }

  /** @internal */
  public stream(model: any, conditions: any, options: AdapterFindOptions): stream.Readable {
    throw new Error('not implemented');
  }

  /** @internal */
  public async count(model: string, conditions: any, options: AdapterCountOptions): Promise<number> {
    return Promise.reject(new Error('not implemented'));
  }

  /** @internal */
  public async delete(model: string, conditions: any, options: { transaction?: Transaction }): Promise<number> {
    const keys = await this._getKeys(tableize(model), conditions);
    if (keys.length === 0) {
      return 0;
    }
    let count;
    try {
      count = await this._client.delAsync(keys);
    } catch (error) {
      throw RedisAdapter.wrapError('unknown error', error);
    }
    return count;
  }

  /** @internal */
  public close(): void {
    //
  }

  /**
   * Connects to the database
   * @internal
   */
  public async connect(settings: AdapterSettingsRedis) {
    const methods = ['del', 'exists', 'hdel', 'hgetall', 'hmset', 'incr', 'keys', 'select'];
    this._client = redis.createClient(settings.port || 6379, settings.host || '127.0.0.1');
    for (const method of methods) {
      this._client[method + 'Async'] = util.promisify(this._client[method]);
    }
    return await this._client.selectAsync(settings.database || 0);
  }

  /** @internal */
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

  /** @internal */
  private async _getKeys(table: any, conditions: any) {
    if (Array.isArray(conditions)) {
      if (conditions.length === 0) {
        return await this._client.keysAsync(`${table}:*`);
      }
      const all_keys: any[] = [];
      await Promise.all(
        conditions.map(async (condition) => {
          const keys = await this._getKeys(table, condition);
          [].push.apply(all_keys, keys);
        }),
      );
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

export function createAdapter(connection: Connection) {
  if (!redis) {
    console.log('Install redis module to use this adapter');
    process.exit(1);
  }
  return new RedisAdapter(connection);
}
