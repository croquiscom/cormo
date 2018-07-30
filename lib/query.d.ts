/// <reference types="node" />
import * as stream from 'stream';
import { Model } from './model';
import { RecordID } from './types';
export interface IQuerySingle<T> extends PromiseLike<T> {
    find(id: RecordID): IQuerySingle<T>;
    find(id: RecordID[]): IQueryArray<T>;
    findPreserve(id: RecordID[]): IQueryArray<T>;
    where(condition?: object): IQuerySingle<T>;
    select(columns: string): IQuerySingle<T>;
    order(orders: string): IQuerySingle<T>;
    group<U = T>(group_by: string | null, fields: object): IQuerySingle<U>;
    one(): IQuerySingle<T>;
    limit(limit?: number): IQuerySingle<T>;
    skip(skip?: number): IQuerySingle<T>;
    if(condition: boolean): IQuerySingle<T>;
    endif(): IQuerySingle<T>;
    include(column: string, select?: string): IQuerySingle<T>;
    exec(): PromiseLike<T>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2>;
    count(): PromiseLike<number>;
    update(updates: object): PromiseLike<number>;
    upsert(updates: object): PromiseLike<number>;
    delete(): PromiseLike<number>;
}
export interface IQueryArray<T> extends PromiseLike<T[]> {
    find(id: RecordID): IQuerySingle<T>;
    find(id: RecordID[]): IQueryArray<T>;
    findPreserve(id: RecordID[]): IQueryArray<T>;
    where(condition?: object): IQueryArray<T>;
    select(columns: string): IQueryArray<T>;
    order(orders: string): IQueryArray<T>;
    group<U = T>(group_by: string | null, fields: object): IQueryArray<U>;
    one(): IQuerySingle<T>;
    limit(limit?: number): IQueryArray<T>;
    skip(skip?: number): IQueryArray<T>;
    if(condition: boolean): IQueryArray<T>;
    endif(): IQueryArray<T>;
    include(column: string, select?: string): IQueryArray<T>;
    exec(): PromiseLike<T[]>;
    then<TResult1 = T[], TResult2 = never>(onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2>;
    count(): PromiseLike<number>;
    update(updates: object): PromiseLike<number>;
    upsert(updates: object): PromiseLike<number>;
    delete(): PromiseLike<number>;
}
/**
 * Collects conditions to query
 */
declare class Query<T> {
    private _model;
    private _name;
    private _connection;
    private _adapter;
    private _ifs;
    private _current_if;
    /**
     * Creates a query instance
     */
    constructor(model: typeof Model);
    /**
     * Finds a record by id
     * @chainable
     */
    find(id: RecordID | RecordID[]): Query<T>;
    /**
     * Finds records by ids while preserving order.
     * @chainable
     */
    findPreserve(ids: RecordID[]): Query<T>;
    /**
     * Finds records near target
     * @chainable
     */
    near(target: object): this;
    /**
     * Finds records by condition
     * @chainable
     */
    where(condition?: object): this;
    /**
     * Selects columns for result
     * @chainable
     */
    select(columns: string): this;
    /**
     * Specifies orders of result
     * @chainable
     */
    order(orders: string): this;
    /**
     * Groups result records
     * @chainable
     */
    group<U = T>(group_by: string | null, fields: object): this;
    /**
     * Returns only one record (or null if does not exists).
     *
     * This is different from limit(1). limit(1) returns array of length 1 while this returns an instance.
     * @chainable
     */
    one(): this;
    /**
     * Sets limit of query
     * @chainable
     */
    limit(limit: number): this;
    /**
     * Sets skip of query
     * @chainable
     */
    skip(skip: number): this;
    /**
     * Returns raw instances instead of model instances
     * @chainable
     * @see Query::exec
     */
    lean(lean?: boolean): this;
    /**
     * Makes a part of the query chain conditional
     * @chainable
     * @see Query::endif
     */
    if(condition: boolean): this;
    /**
     * Ends last if
     * @chainable
     * @see Query::if
     */
    endif(): this;
    /**
     * Cache result.
     *
     * If cache of key exists, actual query does not performed.
     * If cache does not exist, query result will be saved in cache.
     *
     * Redis is used to cache.
     * @param {Object} options
     * @param {String} options.key
     * @param {Number} options.ttl TTL in seconds
     * @param {Boolean} options.refresh don't load from cache if true
     * @chainable
     */
    cache(options: any): this;
    /**
     * Returns associated objects also
     * @param {String} column
     * @param {String} [select]
     * @chainable
     */
    include(column: any, select: any): this;
    /**
     * Executes the query
     * @param {Object} [options]
     * @param {Boolean} [options.skip_log=false]
     * @return {Model|Array<Model>}
     * @promise
     * @see AdapterBase::findById
     * @see AdapterBase::find
     */
    exec(options?: any): Promise<any>;
    /**
     * Executes the query and returns a readable stream
     * @param {Object} [options]
     * @param {Boolean} [options.skip_log=false]
     * @return {Readable}
     * @see AdapterBase::findById
     * @see AdapterBase::find
     */
    stream(): stream.Transform;
    /**
     * Explains the query
     * @return {Object}
     * @promise
     */
    explain(): Promise<any>;
    /**
     * Executes the query as a promise (.then == .exec().then)
     * @param {Function} fulfilled
     * @param {Function} rejected
     * @promise
     */
    then(fulfilled: any, rejected: any): Promise<any>;
    /**
     * Executes the query as a count operation
     * @return {Number}
     * @promise
     * @see AdapterBase::count
     */
    count(): Promise<never>;
    /**
     * Executes the query as a update operation
     * @param {Object} updates
     * @return {Number}
     * @promise
     * @see AdapterBase::count
     */
    update(updates: any): Promise<number>;
    /**
     * Executes the query as an insert or update operation
     * @param {Object} updates
     * @return {Number}
     * @promise
     * @see AdapterBase::count
     */
    upsert(updates: any): Promise<number>;
    /**
     * Executes the query as a delete operation
     * @param {Object} [options]
     * @param {Boolean} [options.skip_log=false]
     * @return {Number}
     * @promise
     * @see AdapterBase::delete
     */
    delete(options?: any): Promise<number>;
    private _exec;
    private _execAndInclude;
    private _validateAndBuildSaveData;
    private _doIntegrityActions;
    private _doArchiveAndIntegrity;
    private _addCondition;
}
export { Query };
