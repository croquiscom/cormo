import stream from 'stream';
import { BaseModel, ModelColumnNamesWithId } from './model';
import { Transaction } from './transaction';
import { RecordID } from './types';
interface QueryOptions {
    lean: boolean;
    orders?: string;
    near?: any;
    select_columns?: string[];
    select_single: boolean;
    conditions_of_group: any[];
    group_fields?: any;
    group_by?: string[];
    joins: Array<{
        model_class: typeof BaseModel;
        type: string;
        alias?: string;
        base_column?: string;
        join_column?: string;
    }>;
    distinct?: boolean;
    limit?: number;
    skip?: number;
    one?: boolean;
    explain?: boolean;
    cache?: {
        key: string;
        ttl: number;
        refresh?: boolean;
    };
    transaction?: Transaction;
    node?: 'master' | 'read';
    index_hint?: string;
}
export interface QuerySingle<M extends BaseModel, T = M> extends PromiseLike<T> {
    clone(): QuerySingle<M, T>;
    find(id: RecordID): QuerySingle<M, T>;
    find(id: RecordID[]): QueryArray<M, T>;
    findPreserve(id: RecordID[]): QueryArray<M, T>;
    near(target: object): QuerySingle<M, T>;
    where(condition?: object): QuerySingle<M, T>;
    select<K extends ModelColumnNamesWithId<M>>(columns: K[]): QuerySingle<M, Pick<M, K>>;
    select<K extends ModelColumnNamesWithId<M>>(columns?: string): QuerySingle<M, Pick<M, K>>;
    selectSingle<K extends ModelColumnNamesWithId<M>>(column: K): QuerySingle<M, M[K]>;
    order(orders?: string): QuerySingle<M, T>;
    group<G extends ModelColumnNamesWithId<M>, F>(group_by: G | G[], fields?: F): QuerySingle<M, {
        [field in keyof F]: number;
    } & Pick<M, G>>;
    group<F>(group_by: null, fields?: F): QuerySingle<M, {
        [field in keyof F]: number;
    }>;
    group<U>(group_by: string | null, fields?: object): QuerySingle<M, U>;
    join(model: typeof BaseModel, options?: {
        alias?: string;
        base_column?: string;
        join_column?: string;
    }): QuerySingle<M, T>;
    left_outer_join(model: typeof BaseModel, options?: {
        alias?: string;
        base_column?: string;
        join_column?: string;
    }): QuerySingle<M, T>;
    distinct(): QuerySingle<M, T>;
    one(): QuerySingleNull<M, T>;
    limit(limit?: number): QuerySingle<M, T>;
    skip(skip?: number): QuerySingle<M, T>;
    lean(lean?: boolean): QuerySingle<M, T>;
    if(condition: boolean): QuerySingle<M, T>;
    endif(): QuerySingle<M, T>;
    cache(options: QueryOptions['cache']): QuerySingle<M, T>;
    include(column: string, select?: string): QuerySingle<M, T>;
    transaction(transaction?: Transaction): QuerySingle<M, T>;
    using(node: 'master' | 'read'): QuerySingle<M, T>;
    index_hint(hint: string): QuerySingle<M, T>;
    exec(options?: {
        skip_log?: boolean;
    }): PromiseLike<T>;
    stream(): stream.Readable;
    explain(): PromiseLike<any>;
    count(): PromiseLike<number>;
    update(updates: object): PromiseLike<number>;
    upsert(updates: object, options?: {
        ignore_on_update: string[];
    }): PromiseLike<void>;
    delete(options?: any): PromiseLike<number>;
}
interface QuerySingleNull<M extends BaseModel, T = M> extends PromiseLike<T | null> {
    clone(): QuerySingleNull<M, T>;
    find(id: RecordID): QuerySingle<M, T>;
    find(id: RecordID[]): QueryArray<M, T>;
    findPreserve(id: RecordID[]): QueryArray<M, T>;
    near(target: object): QuerySingleNull<M, T>;
    where(condition?: object): QuerySingleNull<M, T>;
    select<K extends ModelColumnNamesWithId<M>>(columns: K[]): QuerySingleNull<M, Pick<M, K>>;
    select<K extends ModelColumnNamesWithId<M>>(columns?: string): QuerySingleNull<M, Pick<M, K>>;
    selectSingle<K extends ModelColumnNamesWithId<M>>(column: K): QuerySingleNull<M, M[K]>;
    order(orders?: string): QuerySingleNull<M, T>;
    group<G extends ModelColumnNamesWithId<M>, F>(group_by: G | G[], fields?: F): QuerySingleNull<M, {
        [field in keyof F]: number;
    } & Pick<M, G>>;
    group<F>(group_by: null, fields?: F): QuerySingleNull<M, {
        [field in keyof F]: number;
    }>;
    group<U>(group_by: string | null, fields?: object): QuerySingleNull<M, U>;
    join(model: typeof BaseModel, options?: {
        alias?: string;
        base_column?: string;
        join_column?: string;
    }): QuerySingleNull<M, T>;
    left_outer_join(model: typeof BaseModel, options?: {
        alias?: string;
        base_column?: string;
        join_column?: string;
    }): QuerySingleNull<M, T>;
    distinct(): QuerySingleNull<M, T>;
    one(): QuerySingleNull<M, T>;
    limit(limit?: number): QuerySingleNull<M, T>;
    skip(skip?: number): QuerySingleNull<M, T>;
    lean(lean?: boolean): QuerySingleNull<M, T>;
    if(condition: boolean): QuerySingleNull<M, T>;
    endif(): QuerySingleNull<M, T>;
    cache(options: QueryOptions['cache']): QuerySingleNull<M, T>;
    include(column: string, select?: string): QuerySingleNull<M, T>;
    transaction(transaction?: Transaction): QuerySingleNull<M, T>;
    using(node: 'master' | 'read'): QuerySingleNull<M, T>;
    index_hint(hint: string): QuerySingleNull<M, T>;
    exec(options?: {
        skip_log?: boolean;
    }): PromiseLike<T | null>;
    stream(): stream.Readable;
    explain(): PromiseLike<any>;
    count(): PromiseLike<number>;
    update(updates: object): PromiseLike<number>;
    upsert(updates: object, options?: {
        ignore_on_update: string[];
    }): PromiseLike<void>;
    delete(options?: any): PromiseLike<number>;
}
export interface QueryArray<M extends BaseModel, T = M> extends PromiseLike<T[]> {
    clone(): QueryArray<M, T>;
    find(id: RecordID): QuerySingle<M, T>;
    find(id: RecordID[]): QueryArray<M, T>;
    findPreserve(id: RecordID[]): QueryArray<M, T>;
    near(target: object): QueryArray<M, T>;
    where(condition?: object): QueryArray<M, T>;
    select<K extends ModelColumnNamesWithId<M>>(columns: K[]): QueryArray<M, Pick<M, K>>;
    select<K extends ModelColumnNamesWithId<M>>(columns?: string): QueryArray<M, Pick<M, K>>;
    selectSingle<K extends ModelColumnNamesWithId<M>>(column: K): QueryArray<M, M[K]>;
    order(orders?: string): QueryArray<M, T>;
    group<G extends ModelColumnNamesWithId<M>, F>(group_by: G | G[], fields?: F): QueryArray<M, {
        [field in keyof F]: number;
    } & Pick<M, G>>;
    group<F>(group_by: null, fields?: F): QueryArray<M, {
        [field in keyof F]: number;
    }>;
    group<U>(group_by: string | null, fields?: object): QueryArray<M, U>;
    join(model: typeof BaseModel, options?: {
        alias?: string;
        base_column?: string;
        join_column?: string;
    }): QueryArray<M, T>;
    left_outer_join(model: typeof BaseModel, options?: {
        alias?: string;
        base_column?: string;
        join_column?: string;
    }): QueryArray<M, T>;
    distinct(): QueryArray<M, T>;
    one(): QuerySingleNull<M, T>;
    limit(limit?: number): QueryArray<M, T>;
    skip(skip?: number): QueryArray<M, T>;
    lean(lean?: boolean): QueryArray<M, T>;
    if(condition: boolean): QueryArray<M, T>;
    endif(): QueryArray<M, T>;
    cache(options: QueryOptions['cache']): QueryArray<M, T>;
    include(column: string, select?: string): QueryArray<M, T>;
    transaction(transaction?: Transaction): QueryArray<M, T>;
    using(node: 'master' | 'read'): QueryArray<M, T>;
    index_hint(hint: string): QueryArray<M, T>;
    exec(options?: {
        skip_log?: boolean;
    }): PromiseLike<T[]>;
    stream(): stream.Readable;
    explain(): PromiseLike<any>;
    count(): PromiseLike<number>;
    update(updates: object): PromiseLike<number>;
    upsert(updates: object, options?: {
        ignore_on_update: string[];
    }): PromiseLike<void>;
    delete(options?: any): PromiseLike<number>;
}
/**
 * Collects conditions to query
 */
declare class Query<M extends BaseModel, T = M> implements QuerySingle<M, T>, QueryArray<M, T> {
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
    private _used;
    /**
     * Creates a query instance
     */
    constructor(model: typeof BaseModel);
    clone(): Query<M, T>;
    /**
     * Finds a record by id
     */
    find(id: RecordID): QuerySingle<M, T>;
    find(id: RecordID[]): QueryArray<M, T>;
    /**
     * Finds records by ids while preserving order.
     */
    findPreserve(ids: RecordID[]): QueryArray<M, T>;
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
    select<K extends ModelColumnNamesWithId<M>>(columns?: string | string[]): QuerySingle<M, Pick<M, K>>;
    select<K extends ModelColumnNamesWithId<M>>(columns?: string | string[]): QueryArray<M, Pick<M, K>>;
    selectSingle<K extends ModelColumnNamesWithId<M>>(column: K): QuerySingle<M, M[K]>;
    selectSingle<K extends ModelColumnNamesWithId<M>>(column: K): QueryArray<M, M[K]>;
    /**
     * Specifies orders of result
     */
    order(orders?: string): this;
    /**
     * Groups result records
     */
    group<U>(group_by: string | string[] | null, fields?: object): QuerySingle<M, U>;
    group<U>(group_by: string | string[] | null, fields?: object): QueryArray<M, U>;
    /**
     * (inner) join
     */
    join(model_class: typeof BaseModel, options?: {
        alias?: string;
        base_column?: string;
        join_column?: string;
    }): this;
    /**
     * left outer join
     */
    left_outer_join(model_class: typeof BaseModel, options?: {
        alias?: string;
        base_column?: string;
        join_column?: string;
    }): this;
    /**
     * Returns distinct records
     */
    distinct(): this;
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
    cache(options: QueryOptions['cache']): this;
    /**
     * Returns associated objects also
     */
    include(column: string, select?: string): this;
    transaction(transaction?: Transaction): this;
    using(node: 'master' | 'read'): this;
    index_hint(hint: string): this;
    /**
     * Executes the query
     * @see AdapterBase::findById
     * @see AdapterBase::find
     */
    exec(options?: {
        skip_log?: boolean;
    }): Promise<any>;
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
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2>;
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
    upsert(updates: any, options?: {
        ignore_on_update: string[];
    }): Promise<void>;
    /**
     * Executes the query as a delete operation
     * @see AdapterBase::delete
     */
    delete(options?: any): Promise<number>;
    private _exec;
    private _getAdapterFindOptions;
    private _getAdapterDeleteOptions;
    private _execAndInclude;
    private _validateAndBuildSaveData;
    private _doIntegrityActions;
    private _doArchiveAndIntegrity;
    private _addCondition;
    private _setUsed;
}
export { Query };
