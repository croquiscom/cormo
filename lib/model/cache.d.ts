/**
 * Model cache
 * @namespace model
 */
declare class ModelCache {
    static _loadFromCache(key: any, refresh: any): Promise<any>;
    static _saveToCache(key: any, ttl: any, data: any): Promise<{}>;
    static removeCache(key: any): Promise<{}>;
}
export { ModelCache };
