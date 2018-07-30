import { IQueryArray, IQuerySingle, Query } from '../query';
import * as types from '../types';
import { Model } from './index';

export type ModelQueryMethod = 'find' | 'findPreserve' | 'where'
  | 'select' | 'order';

/**
 * Model query
 * @namespace model
 */
class ModelQuery {
  /**
   * Creates q query object
   */
  public static query(this: typeof Model): IQueryArray<Model> {
    return new Query(this);
  }

  /**
   * Finds a record by id
   * @throws {Error('not found')}
   */
  public static find(id: types.RecordID): IQuerySingle<Model>;
  public static find(id: types.RecordID[]): IQueryArray<Model>;
  public static find(
    this: typeof Model, id: types.RecordID | types.RecordID[],
  ): IQuerySingle<Model> | IQueryArray<Model> {
    return this._createQueryAndRun('find', id);
  }

  /**
   * Finds records by ids while preserving order.
   * @throws {Error('not found')}
   */
  public static findPreserve(this: typeof Model, ids: types.RecordID[]): IQueryArray<Model> {
    return this._createQueryAndRun('findPreserve', ids);
  }

  /**
   * Finds records by conditions
   */
  public static where(this: typeof Model, condition?: object): IQueryArray<Model> {
    return this._createOptionalQueryAndRun('where', condition);
  }

  /**
   * Selects columns for result
   */
  public static select(this: typeof Model, columns: string): IQueryArray<Model> {
    return this._createOptionalQueryAndRun('select', columns);
  }

  /**
   * Specifies orders of result
   */
  public static order(this: typeof Model, orders: string): IQueryArray<Model> {
    return this._createOptionalQueryAndRun('order', orders);
  }

  /**
   * Groups result records
   */
  public static group<U = Model>(this: typeof Model, group_by: string | null, fields: object): IQueryArray<U> {
    const query = new Query(this);
    query.group<U>(group_by, fields);
    return query;
  }

  /**
   * Counts records by conditions
   */
  public static async count(this: typeof Model, condition: object): Promise<number> {
    return await new Query(this).where(condition).count();
  }

  /**
   * Updates some fields of records that match conditions
   */
  public static async update(this: typeof Model, updates: object, condition: object): Promise<number> {
    return await new Query(this).where(condition).update(updates);
  }

  /**
   * Deletes records by conditions
   * @param {Object} [condition]
   * @return {Number}
   * @promise
   */
  public static async delete(this: typeof Model, condition: object): Promise<number> {
    return await new Query(this).where(condition).delete();
  }

  public static _createQueryAndRun(
    this: typeof Model, criteria: ModelQueryMethod, data: any,
  ): IQuerySingle<Model> | IQueryArray<Model> {
    const query = new Query(this);
    (query[criteria] as any)(data);
    return query;
  }

  public static _createOptionalQueryAndRun(
    this: typeof Model, criteria: ModelQueryMethod, data: any,
  ): IQuerySingle<Model> | IQueryArray<Model> {
    return this._createQueryAndRun(criteria, data);
  }
}

export { ModelQuery };
