import { tableize } from '../util/inflector';
import { Model } from './index';

/**
 * Model cache
 * @namespace model
 */
class ModelCache {
  public static async _loadFromCache(this: typeof Model, key: string, refresh?: boolean): Promise<any> {
    if (refresh) {
      throw new Error('error');
    }
    const redis = await this._connection._connectRedisCache();
    key = 'CC.' + tableize(this._name) + ':' + key;
    const value = await new Promise<string>((resolve, reject) => {
      redis.get(key, (error: Error, v: string) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(v);
      });
    });
    if (value == null) {
      throw new Error('error');
    }
    return JSON.parse(value);
  }

  public static async _saveToCache(this: typeof Model, key: string, ttl: number, data: any) {
    const redis = await this._connection._connectRedisCache();
    key = 'CC.' + tableize(this._name) + ':' + key;
    await new Promise((resolve, reject) => {
      redis.setex(key, ttl, JSON.stringify(data), (error: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  public static async removeCache(this: typeof Model, key: string) {
    const redis = await this._connection._connectRedisCache();
    key = 'CC.' + tableize(this._name) + ':' + key;
    await new Promise((resolve) => {
      redis.del(key, () => {
        resolve();
      });
    });
  }
}

export { ModelCache };
