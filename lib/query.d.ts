/// <reference types="node" />
import * as stream from 'stream';
import { Model } from './model';
import { RecordID } from './types';
interface IQueryOptions {
    conditions_of_group: any[];
    lean: boolean;
    orders: any[];
    near?: any;
    select?: any;
    select_raw?: any;
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
    private _options;
    private _conditions;
    private _includes;
    private _id;
    private _find_single_id;
    private _preserve_order_ids?;
    /**
     * Creates a query instance
     */
    constructor(model: typeof Model);
    /**
     * Finds a record by id
     */
    find(id: RecordID | RecordID[]): this;
    /**
     * Finds records by ids while preserving order.
     */
    findPreserve(ids: RecordID[]): this;
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
    select(columns: string): this;
    /**
     * Specifies orders of result
     */
    order(orders: string): this;
    /**
     * Groups result records
     */
    group<U = T>(group_by: string | null, fields: object): this;
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
    then(fulfilled: any, rejected: any): Promise<any>;
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
