/* eslint-disable @typescript-eslint/no-unused-vars */

import stream from 'stream';
import _ from 'lodash';
import { Connection } from '../connection/index.js';
import { ColumnPropertyInternal } from '../model/index.js';
import { Transaction } from '../transaction.js';
import * as types from '../types.js';
import { tableize } from '../util/inflector.js';
import {
  AdapterBase,
  AdapterCountOptions,
  AdapterDeleteOptions,
  AdapterFindOptions,
  AdapterUpsertOptions,
} from './base.js';

let redis: any;

const module_promise = import('ioredis')
  .then((m) => {
    redis = m.default;
  })
  .catch(() => {
    //
  });

export interface AdapterSettingsRedis {
  host?: string;
  port?: number;
  database: string;
}

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
  public async drop(model_name: string) {
    await this.delete(model_name, [], { orders: [] });
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
  public async create(
    model_name: string,
    data: any,
    options: { transaction?: Transaction; use_id_in_data?: boolean },
  ): Promise<any> {
    data.$_$ = ''; // ensure that there is one argument(one field) at least
    let id;
    try {
      if (options.use_id_in_data) {
        id = data.id;
      } else {
        id = await this._client.incr(`${tableize(model_name)}:_lastid`);
      }
    } catch (error: any) {
      throw RedisAdapter.wrapError('unknown error', error);
    }
    try {
      await this._client.hmset(`${tableize(model_name)}:${id}`, data);
    } catch (error: any) {
      throw RedisAdapter.wrapError('unknown error', error);
    }
    return id;
  }

  /** @internal */
  public async createBulk(
    model_name: string,
    data: any[],
    options: { transaction?: Transaction; use_id_in_data?: boolean },
  ): Promise<any[]> {
    return await this._createBulkDefault(model_name, data, options);
  }

  /** @internal */
  public async update(model_name: string, data: any, options: { transaction?: Transaction }) {
    const key = `${tableize(model_name)}:${data.id}`;
    delete data.id;
    data.$_$ = ''; // ensure that there is one argument(one field) at least
    let exists;
    try {
      exists = await this._client.exists(key);
    } catch (error: any) {
      throw RedisAdapter.wrapError('unknown error', error);
    }
    if (!exists) {
      return;
    }
    try {
      await this._client.del(key);
    } catch (error: any) {
      throw RedisAdapter.wrapError('unknown error', error);
    }
    try {
      await this._client.hmset(key, data);
    } catch (error: any) {
      throw RedisAdapter.wrapError('unknown error', error);
    }
  }

  /** @internal */
  public async updatePartial(
    model_name: string,
    data: any,
    conditions: Array<Record<string, any>>,
    options: { transaction?: Transaction },
  ): Promise<number> {
    const fields_to_del = Object.keys(data).filter((key) => data[key] == null);
    fields_to_del.forEach((key) => {
      return delete data[key];
    });
    fields_to_del.push('$_$'); // ensure that there is one argument at least
    const table = tableize(model_name);
    data.$_$ = ''; // ensure that there is one argument(one field) at least
    const keys = await this._getKeys(table, conditions);
    for (const key of keys) {
      const args = _.clone(fields_to_del);
      args.unshift(key);
      try {
        await this._client.hdel(args);
      } catch (error: any) {
        throw RedisAdapter.wrapError('unknown error', error);
      }
      try {
        await this._client.hmset(key, data);
      } catch (error: any) {
        throw RedisAdapter.wrapError('unknown error', error);
      }
    }
    return keys.length;
  }

  /** @internal */
  public async upsert(
    model_name: string,
    data: any,
    conditions: Array<Record<string, any>>,
    options: AdapterUpsertOptions,
  ): Promise<void> {
    return Promise.reject(new Error('not implemented'));
  }

  /** @internal */
  public async findById(
    model_name: string,
    id: any,
    options: { select?: string[]; explain?: boolean; transaction?: Transaction },
  ): Promise<any> {
    let result;
    try {
      const key = `${tableize(model_name)}:${id}`;
      if (await this._client.exists(key)) {
        result = await this._client.hgetall(key);
      }
    } catch (error: any) {
      throw RedisAdapter.wrapError('unknown error', error);
    }
    if (result) {
      result.id = id;
      return this._convertToModelInstance(model_name, result, options);
    } else {
      throw new Error('not found');
    }
  }

  /** @internal */
  public async find(
    model_name: string,
    conditions: Array<Record<string, any>>,
    options: AdapterFindOptions,
  ): Promise<any> {
    const table = tableize(model_name);
    const keys = await this._getKeys(table, conditions);
    let records: any[] = await Promise.all(
      keys.map(async (key: any) => {
        const result = (await this._client.exists(key)) ? await this._client.hgetall(key) : undefined;
        if (result) {
          result.id = Number(key.substr(table.length + 1));
        }
        return result;
      }),
    );
    records = records.filter((record) => record != null);
    return records.map((record) => {
      return this._convertToModelInstance(model_name, record, options);
    });
  }

  /** @internal */
  public stream(
    model_name: string,
    conditions: Array<Record<string, any>>,
    options: AdapterFindOptions,
  ): stream.Readable {
    throw new Error('not implemented');
  }

  /** @internal */
  public async count(
    model_name: string,
    conditions: Array<Record<string, any>>,
    options: AdapterCountOptions,
  ): Promise<number> {
    return Promise.reject(new Error('not implemented'));
  }

  /** @internal */
  public async delete(
    model_name: string,
    conditions: Array<Record<string, any>>,
    options: AdapterDeleteOptions,
  ): Promise<number> {
    const keys = await this._getKeys(tableize(model_name), conditions);
    if (keys.length === 0) {
      return 0;
    }
    let count;
    try {
      count = await this._client.del(keys);
    } catch (error: any) {
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
    await module_promise;
    if (!redis) {
      console.log('Install redis module to use this adapter');
      process.exit(1);
    }

    const methods = ['del', 'exists', 'hdel', 'hgetall', 'hmset', 'incr', 'keys', 'select'];
    this._client = redis.createClient(settings.port || 6379, settings.host || '127.0.0.1');
    return await this._client.select(settings.database || 0);
  }

  /** @internal */
  protected valueToModel(value: any, property: ColumnPropertyInternal, query_record_id_as_string: boolean) {
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
        if (property.record_id && query_record_id_as_string) {
          return String(value);
        }
        return value;
    }
  }

  /** @internal */
  private async _getKeys(table: any, conditions: Array<Record<string, any>> | Record<string, any>) {
    if (Array.isArray(conditions)) {
      if (conditions.length === 0) {
        return await this._client.keys(`${table}:*`);
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
  return new RedisAdapter(connection);
}
