import { Model } from './index';
/**
 * Model cache
 * @namespace model
 */
declare class ModelCache {
    static _loadFromCache(this: typeof Model, key: string, refresh?: boolean): Promise<any>;
    static _saveToCache(this: typeof Model, key: string, ttl: number, data: any): Promise<void>;
    static removeCache(this: typeof Model, key: string): Promise<void>;
}
export { ModelCache };
