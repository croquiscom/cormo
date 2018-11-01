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
export interface IQuerySingle<M extends BaseModel, T = M> extends PromiseLike<T> {
    find(id: RecordID): IQuerySingle<M, T>;
    find(id: RecordID[]): IQueryArray<M, T>;
    findPreserve(id: RecordID[]): IQueryArray<M, T>;
    near(target: object): IQuerySingle<M, T>;
    where(condition?: object): IQuerySingle<M, T>;
    select<K extends ModelColumnNamesWithId<M>>(columns: K[]): IQuerySingle<M, Pick<M, K>>;
    select<K extends ModelColumnNamesWithId<M>>(columns?: string): IQuerySingle<M, Pick<M, K>>;
    selectSingle<K extends ModelColumnNamesWithId<M>>(column: K): IQuerySingle<M, M[K]>;
    order(orders: string): IQuerySingle<M, T>;
    group<G extends ModelColumnNamesWithId<M>, F>(group_by: G | G[], fields?: F): IQuerySingle<M, {
        [field in keyof F]: number;
    } & Pick<M, G>>;
    group<F>(group_by: null, fields?: F): IQuerySingle<M, {
        [field in keyof F]: number;
    }>;
    group<U>(group_by: string | null, fields?: object): IQuerySingle<M, U>;
    one(): IQuerySingle<M, T>;
    limit(limit?: number): IQuerySingle<M, T>;
    skip(skip?: number): IQuerySingle<M, T>;
    lean(lean?: boolean): IQuerySingle<M, T>;
    if(condition: boolean): IQuerySingle<M, T>;
    endif(): IQuerySingle<M, T>;
    cache(options: IQueryOptions['cache']): IQuerySingle<M, T>;
    include(column: string, select?: string): IQuerySingle<M, T>;
    exec(options?: any): PromiseLike<T>;
    stream(): stream.Readable;
    explain(): PromiseLike<any>;
    count(): PromiseLike<number>;
    update(updates: object): PromiseLike<number>;
    upsert(updates: object): PromiseLike<void>;
    delete(options?: any): PromiseLike<number>;
}
export interface IQueryArray<M extends BaseModel, T = M> extends PromiseLike<T[]> {
    find(id: RecordID): IQuerySingle<M, T>;
    find(id: RecordID[]): IQueryArray<M, T>;
    findPreserve(id: RecordID[]): IQueryArray<M, T>;
    near(target: object): IQueryArray<M, T>;
    where(condition?: object): IQueryArray<M, T>;
    select<K extends ModelColumnNamesWithId<M>>(columns: K[]): IQueryArray<M, Pick<M, K>>;
    select<K extends ModelColumnNamesWithId<M>>(columns?: string): IQueryArray<M, Pick<M, K>>;
    selectSingle<K extends ModelColumnNamesWithId<M>>(column: K): IQueryArray<M, M[K]>;
    order(orders: string): IQueryArray<M, T>;
    group<G extends ModelColumnNamesWithId<M>, F>(group_by: G | G[], fields?: F): IQueryArray<M, {
        [field in keyof F]: number;
    } & Pick<M, G>>;
    group<F>(group_by: null, fields?: F): IQueryArray<M, {
        [field in keyof F]: number;
    }>;
    group<U>(group_by: string | null, fields?: object): IQueryArray<M, U>;
    one(): IQuerySingle<M, T>;
    limit(limit?: number): IQueryArray<M, T>;
    skip(skip?: number): IQueryArray<M, T>;
    lean(lean?: boolean): IQueryArray<M, T>;
    if(condition: boolean): IQueryArray<M, T>;
    endif(): IQueryArray<M, T>;
    cache(options: IQueryOptions['cache']): IQueryArray<M, T>;
    include(column: string, select?: string): IQueryArray<M, T>;
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
declare class Query<M extends BaseModel, T = M> implements IQuerySingle<M, T>, IQueryArray<M, T> {
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
    find(id: RecordID): IQuerySingle<M, T>;
    find(id: RecordID[]): IQueryArray<M, T>;
    /**
     * Finds records by ids while preserving order.
     */
    findPreserve(ids: RecordID[]): IQueryArray<M, T>;
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
    select<K extends ModelColumnNamesWithId<M>>(columns?: string | string[]): IQuerySingle<M, Pick<M, K>>;
    select<K extends ModelColumnNamesWithId<M>>(columns?: string | string[]): IQueryArray<M, Pick<M, K>>;
    selectSingle<K extends ModelColumnNamesWithId<M>>(column: K): IQuerySingle<M, M[K]>;
    selectSingle<K extends ModelColumnNamesWithId<M>>(column: K): IQueryArray<M, M[K]>;
    /**
     * Specifies orders of result
     */
    order(orders: string): this;
    /**
     * Groups result records
     */
    group<U>(group_by: string | string[] | null, fields?: object): IQuerySingle<M, U>;
    group<U>(group_by: string | string[] | null, fields?: object): IQueryArray<M, U>;
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
