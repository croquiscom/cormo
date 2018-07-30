import { IQueryArray, IQuerySingle } from '../query';
import * as types from '../types';
import { Model } from './index';
export declare type ModelQueryMethod = 'find' | 'findPreserve' | 'where' | 'select' | 'order';
/**
 * Model query
 * @namespace model
 */
declare class ModelQuery {
    /**
     * Creates q query object
     */
    static query(this: typeof Model): IQueryArray<Model>;
    /**
     * Finds a record by id
     * @throws {Error('not found')}
     */
    static find(id: types.RecordID): IQuerySingle<Model>;
    static find(id: types.RecordID[]): IQueryArray<Model>;
    /**
     * Finds records by ids while preserving order.
     * @throws {Error('not found')}
     */
    static findPreserve(this: typeof Model, ids: types.RecordID[]): IQueryArray<Model>;
    /**
     * Finds records by conditions
     */
    static where(this: typeof Model, condition?: object): IQueryArray<Model>;
    /**
     * Selects columns for result
     */
    static select(this: typeof Model, columns: string): IQueryArray<Model>;
    /**
     * Specifies orders of result
     */
    static order(this: typeof Model, orders: string): IQueryArray<Model>;
    /**
     * Groups result records
     */
    static group<U = Model>(this: typeof Model, group_by: string | null, fields: object): IQueryArray<U>;
    /**
     * Counts records by conditions
     */
    static count(this: typeof Model, condition: object): Promise<number>;
    /**
     * Updates some fields of records that match conditions
     */
    static update(this: typeof Model, updates: object, condition: object): Promise<number>;
    /**
     * Deletes records by conditions
     * @param {Object} [condition]
     * @return {Number}
     * @promise
     */
    static delete(this: typeof Model, condition: object): Promise<number>;
    static _createQueryAndRun(this: typeof Model, criteria: ModelQueryMethod, data: any): IQuerySingle<Model> | IQueryArray<Model>;
    static _createOptionalQueryAndRun(this: typeof Model, criteria: ModelQueryMethod, data: any): IQuerySingle<Model> | IQueryArray<Model>;
}
export { ModelQuery };
