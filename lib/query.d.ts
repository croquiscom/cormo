/// <reference types="node" />
import * as stream from 'stream';
import { BaseModel, ModelColumnNamesWithId } from './model';
import { RecordID } from './types';
interface IQueryOptions {
    conditions_of_group: any[];
    lean: boolean;
    orders: any[];
    near?: any;
    select?: string[];
    select_raw?: string[];
    select_single?: string;
    group_fields?: any;
    group_by?: any;
    limit?: number;
    skip?: number;
    one?: boolean;
    explain?: boolean;
    cache?: {
        key: string;
        ttl: number;
        refresh?: boolean;
    };
}
export interface IQuerySingle<T, M extends BaseModel> extends PromiseLike<T> {
    find(id: RecordID): IQuerySingle<T, M>;
    find(id: RecordID[]): IQueryArray<T, M>;
    findPreserve(id: RecordID[]): IQueryArray<T, M>;
    near(target: object): IQuerySingle<T, M>;
    where(condition?: object): IQuerySingle<T, M>;
    select<K extends ModelColumnNamesWithId<M>>(columns: K[]): IQuerySingle<Pick<M, K>, M>;
    select<K extends ModelColumnNamesWithId<M>>(columns?: string): IQuerySingle<Pick<M, K>, M>;
    selectSingle<K extends ModelColumnNamesWithId<M>>(column: K): IQuerySingle<M[K], M>;
    order(orders: string): IQuerySingle<T, M>;
    group<G extends keyof T, F>(group_by: G, fields?: F): IQuerySingle<{
        [field in keyof F]: number;
    } & Pick<T, G>, M>;
    group<G extends keyof T, F>(group_by: null, fields?: F): IQuerySingle<{
        [field in keyof F]: number;
    }, M>;
    group<U>(group_by: string | null, fields?: object): IQuerySingle<U, M>;
    one(): IQuerySingle<T, M>;
    limit(limit?: number): IQuerySingle<T, M>;
    skip(skip?: number): IQuerySingle<T, M>;
    lean(lean?: boolean): IQuerySingle<T, M>;
    if(condition: boolean): IQuerySingle<T, M>;
    endif(): IQuerySingle<T, M>;
    cache(options: IQueryOptions['cache']): IQuerySingle<T, M>;
    include(column: string, select?: string): IQuerySingle<T, M>;
    exec(options?: any): PromiseLike<T>;
    stream(): stream.Readable;
    explain(): PromiseLike<any>;
    count(): PromiseLike<number>;
    update(updates: object): PromiseLike<number>;
    upsert(updates: object): PromiseLike<void>;
    delete(options?: any): PromiseLike<number>;
}
export interface IQueryArray<T, M extends BaseModel> extends PromiseLike<T[]> {
    find(id: RecordID): IQuerySingle<T, M>;
    find(id: RecordID[]): IQueryArray<T, M>;
    findPreserve(id: RecordID[]): IQueryArray<T, M>;
    near(target: object): IQueryArray<T, M>;
    where(condition?: object): IQueryArray<T, M>;
    select<K extends ModelColumnNamesWithId<M>>(columns: K[]): IQueryArray<Pick<M, K>, M>;
    select<K extends ModelColumnNamesWithId<M>>(columns?: string): IQueryArray<Pick<M, K>, M>;
    selectSingle<K extends ModelColumnNamesWithId<M>>(column: K): IQueryArray<M[K], M>;
    order(orders: string): IQueryArray<T, M>;
    group<G extends keyof T, F>(group_by: G, fields?: F): IQueryArray<{
        [field in keyof F]: number;
    } & Pick<T, G>, M>;
    group<F>(group_by: null, fields?: F): IQueryArray<{
        [field in keyof F]: number;
    }, M>;
    group<U>(group_by: string | null, fields?: object): IQueryArray<U, M>;
    one(): IQuerySingle<T, M>;
    limit(limit?: number): IQueryArray<T, M>;
    skip(skip?: number): IQueryArray<T, M>;
    lean(lean?: boolean): IQueryArray<T, M>;
    if(condition: boolean): IQueryArray<T, M>;
    endif(): IQueryArray<T, M>;
    cache(options: IQueryOptions['cache']): IQueryArray<T, M>;
    include(column: string, select?: string): IQueryArray<T, M>;
    exec(options?: any): PromiseLike<T[]>;
    stream(): stream.Readable;
    explain(): PromiseLike<any>;
    count(): PromiseLike<number>;
    update(updates: object): PromiseLike<number>;
    upsert(updates: object): PromiseLike<void>;
    delete(options?: any): PromiseLike<number>;
}
/**
 * Collects conditions to query
 */
declare class Query<T, M extends BaseModel> implements IQuerySingle<T, M>, IQueryArray<T, M> {
    private _model;
    private _name;
    private _connection;
    private _adapter;
    private _ifs;
    private _current_if;
    private _options;
    private _conditions;
    private _includes;
    private _id;
    private _find_single_id;
    private _preserve_order_ids?;
    /**
     * Creates a query instance
     */
    constructor(model: typeof BaseModel);
    /**
     * Finds a record by id
     */
    find(id: RecordID): IQuerySingle<T, M>;
    find(id: RecordID[]): IQueryArray<T, M>;
    /**
     * Finds records by ids while preserving order.
     */
    findPreserve(ids: RecordID[]): IQueryArray<T, M>;
    /**
     * Finds records near target
     */
    near(target: object): this;
    /**
     * Finds records by condition
     */
    where(condition?: object): this;
    /**
     * Selects columns for result
     */
    select<K extends ModelColumnNamesWithId<M>>(columns?: string | string[]): IQuerySingle<Pick<M, K>, M>;
    select<K extends ModelColumnNamesWithId<M>>(columns?: string | string[]): IQueryArray<Pick<M, K>, M>;
    selectSingle<K extends ModelColumnNamesWithId<M>>(column: K): IQuerySingle<M[K], M>;
    selectSingle<K extends ModelColumnNamesWithId<M>>(column: K): IQueryArray<M[K], M>;
    /**
     * Specifies orders of result
     */
    order(orders: string): this;
    /**
     * Groups result records
     */
    group<U>(group_by: string | null, fields?: object): IQuerySingle<U, M>;
    group<U>(group_by: string | null, fields?: object): IQueryArray<U, M>;
    /**
     * Returns only one record (or null if does not exists).
     *
     * This is different from limit(1). limit(1) returns array of length 1 while this returns an instance.
     */
    one(): this;
    /**
     * Sets limit of query
     */
    limit(limit: number): this;
    /**
     * Sets skip of query
     */
    skip(skip: number): this;
    /**
     * Returns raw instances instead of model instances
     * @see Query::exec
     */
    lean(lean?: boolean): this;
    /**
     * Makes a part of the query chain conditional
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
     */
    cache(options: IQueryOptions['cache']): this;
    /**
     * Returns associated objects also
     */
    include(column: any, select: any): this;
    /**
     * Executes the query
     * @see AdapterBase::findById
     * @see AdapterBase::find
     */
    exec(options?: any): Promise<any>;
    /**
     * Executes the query and returns a readable stream
     * @see AdapterBase::findById
     * @see AdapterBase::find
     */
    stream(): stream.Readable;
    /**
     * Explains the query
     */
    explain(): Promise<any>;
    /**
     * Executes the query as a promise (.then == .exec().then)
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | ((value: T[]) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2>;
    /**
     * Executes the query as a count operation
     * @see AdapterBase::count
     */
    count(): Promise<number>;
    /**
     * Executes the query as a update operation
     * @see AdapterBase::update
     */
    update(updates: any): Promise<number>;
    /**
     * Executes the query as an insert or update operation
     * @see AdapterBase::upsert
     */
    upsert(updates: any): Promise<void>;
    /**
     * Executes the query as a delete operation
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
