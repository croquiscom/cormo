import stream from 'stream';
import _ from 'lodash';

import { AdapterBase, AdapterFindOptions } from './adapters/base';
import { Connection } from './connection';
import { BaseModel, ModelColumnNamesWithId } from './model';
import { Transaction } from './transaction';
import { RecordID } from './types';
import { foreign_key } from './util/inflector';

interface QueryOptions {
  lean: boolean;
  orders?: string;
  near?: any;
  select_columns?: string[];
  select_single: boolean;
  conditions_of_group: any[];
  group_fields?: any;
  group_by?: string[];
  joins: Array<{ model_class: typeof BaseModel; type: string }>;
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
  group<G extends ModelColumnNamesWithId<M>, F>(
    group_by: G | G[],
    fields?: F,
  ): QuerySingle<M, { [field in keyof F]: number } & Pick<M, G>>;
  group<F>(group_by: null, fields?: F): QuerySingle<M, { [field in keyof F]: number }>;
  group<U>(group_by: string | null, fields?: object): QuerySingle<M, U>;
  join(model: typeof BaseModel): QuerySingle<M, T>;
  left_outer_join(model: typeof BaseModel): QuerySingle<M, T>;
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

  exec(options?: { skip_log?: boolean }): PromiseLike<T>;
  stream(): stream.Readable;
  explain(): PromiseLike<any>;
  count(): PromiseLike<number>;
  update(updates: object): PromiseLike<number>;
  upsert(updates: object, options?: { ignore_on_update: string[] }): PromiseLike<void>;
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
  group<G extends ModelColumnNamesWithId<M>, F>(
    group_by: G | G[],
    fields?: F,
  ): QuerySingleNull<M, { [field in keyof F]: number } & Pick<M, G>>;
  group<F>(group_by: null, fields?: F): QuerySingleNull<M, { [field in keyof F]: number }>;
  group<U>(group_by: string | null, fields?: object): QuerySingleNull<M, U>;
  join(model: typeof BaseModel): QuerySingleNull<M, T>;
  left_outer_join(model: typeof BaseModel): QuerySingleNull<M, T>;
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

  exec(options?: { skip_log?: boolean }): PromiseLike<T | null>;
  stream(): stream.Readable;
  explain(): PromiseLike<any>;
  count(): PromiseLike<number>;
  update(updates: object): PromiseLike<number>;
  upsert(updates: object, options?: { ignore_on_update: string[] }): PromiseLike<void>;
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
  group<G extends ModelColumnNamesWithId<M>, F>(
    group_by: G | G[],
    fields?: F,
  ): QueryArray<M, { [field in keyof F]: number } & Pick<M, G>>;
  group<F>(group_by: null, fields?: F): QueryArray<M, { [field in keyof F]: number }>;
  group<U>(group_by: string | null, fields?: object): QueryArray<M, U>;
  join(model: typeof BaseModel): QueryArray<M, T>;
  left_outer_join(model: typeof BaseModel): QueryArray<M, T>;
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

  exec(options?: { skip_log?: boolean }): PromiseLike<T[]>;
  stream(): stream.Readable;
  explain(): PromiseLike<any>;
  count(): PromiseLike<number>;
  update(updates: object): PromiseLike<number>;
  upsert(updates: object, options?: { ignore_on_update: string[] }): PromiseLike<void>;
  delete(options?: any): PromiseLike<number>;
}

/**
 * Collects conditions to query
 */
class Query<M extends BaseModel, T = M> implements QuerySingle<M, T>, QueryArray<M, T> {
  private _model: typeof BaseModel;
  private _name: string;
  private _connection: Connection;
  private _adapter: AdapterBase;
  private _ifs: boolean[];
  private _current_if: boolean;
  private _options: QueryOptions;
  private _conditions: Array<Record<string, any>>;
  private _includes: Array<{ column: string; select?: string }>;
  private _id: any;
  private _find_single_id = false;
  private _preserve_order_ids?: any[];
  private _used = false;

  /**
   * Creates a query instance
   */
  constructor(model: typeof BaseModel) {
    this._model = model;
    this._name = model._name;
    this._connection = model._connection;
    this._adapter = model._connection._adapter;
    this._ifs = [];
    this._current_if = true;
    this._conditions = [];
    this._includes = [];
    this._options = {
      conditions_of_group: [],
      lean: model.lean_query,
      node: 'master',
      select_single: false,
      joins: [],
    };
  }

  public clone(): Query<M, T> {
    const cloned = new Query<M, T>(this._model);
    cloned._ifs = _.cloneDeep(this._ifs);
    cloned._current_if = this._current_if;
    cloned._conditions = _.cloneDeep(this._conditions);
    cloned._includes = _.cloneDeep(this._includes);
    cloned._options = _.cloneDeep(this._options);
    cloned._find_single_id = this._find_single_id;
    cloned._used = false;
    return cloned;
  }

  /**
   * Finds a record by id
   */
  public find(id: RecordID): QuerySingle<M, T>;
  public find(id: RecordID[]): QueryArray<M, T>;
  public find(id: RecordID | RecordID[]): QuerySingle<M, T> | QueryArray<M, T> {
    if (!this._current_if) {
      return this;
    }
    if (Array.isArray(id)) {
      this._id = _.uniq(id);
      this._find_single_id = false;
    } else {
      this._id = id;
      this._find_single_id = true;
    }
    return this;
  }

  /**
   * Finds records by ids while preserving order.
   */
  public findPreserve(ids: RecordID[]): QueryArray<M, T> {
    if (!this._current_if) {
      return this;
    }
    this._id = _.uniq(ids);
    this._find_single_id = false;
    this._preserve_order_ids = ids;
    return this;
  }

  /**
   * Finds records near target
   */
  public near(target: object): this {
    if (!this._current_if) {
      return this;
    }
    this._options.near = target;
    return this;
  }

  /**
   * Finds records by condition
   */
  public where(condition?: object): this {
    if (!this._current_if) {
      return this;
    }
    if (Array.isArray(condition)) {
      condition.forEach((cond) => {
        this._addCondition(cond);
      });
    } else if (condition != null) {
      this._addCondition(condition);
    }
    return this;
  }

  /**
   * Selects columns for result
   */
  public select<K extends ModelColumnNamesWithId<M>>(columns?: string | string[]): QuerySingle<M, Pick<M, K>>;
  public select<K extends ModelColumnNamesWithId<M>>(columns?: string | string[]): QueryArray<M, Pick<M, K>>;
  public select<K extends ModelColumnNamesWithId<M>>(
    columns?: string | string[],
  ): QuerySingle<M, Pick<M, K>> | QueryArray<M, Pick<M, K>> {
    if (!this._current_if) {
      return this as any;
    }
    this._options.select_columns = undefined;
    this._options.select_single = false;
    if (columns != null) {
      if (typeof columns === 'string') {
        columns = columns.split(/\s+/);
        columns.push('id');
      }
      if (columns.length > 0) {
        this._options.select_columns = columns;
      }
    }
    return this as any;
  }

  public selectSingle<K extends ModelColumnNamesWithId<M>>(column: K): QuerySingle<M, M[K]>;
  public selectSingle<K extends ModelColumnNamesWithId<M>>(column: K): QueryArray<M, M[K]>;
  public selectSingle<K extends ModelColumnNamesWithId<M>>(column: string): QuerySingle<M, M[K]> | QueryArray<M, M[K]> {
    if (!this._current_if) {
      return this as any;
    }
    this._options.select_columns = [column];
    this._options.select_single = true;
    return this as any;
  }

  /**
   * Specifies orders of result
   */
  public order(orders?: string): this {
    if (!this._current_if) {
      return this;
    }
    this._options.orders = orders;
    return this;
  }

  /**
   * Groups result records
   */
  public group<U>(group_by: string | string[] | null, fields?: object): QuerySingle<M, U>;
  public group<U>(group_by: string | string[] | null, fields?: object): QueryArray<M, U>;
  public group<U>(group_by: string | string[] | null, fields?: object): QuerySingle<M, U> | QueryArray<M, U> {
    if (!this._current_if) {
      return this as any;
    }
    this._options.group_by = undefined;
    if (group_by) {
      if (typeof group_by === 'string') {
        group_by = group_by.split(/\s+/);
      }
      this._options.group_by = group_by;
    }
    this._options.group_fields = fields;
    return this as any;
  }

  /**
   * (inner) join
   */
  public join(model_class: typeof BaseModel): this {
    this._options.joins.push({ model_class, type: 'INNER JOIN' });
    return this;
  }

  /**
   * left outer join
   */
  public left_outer_join(model_class: typeof BaseModel): this {
    this._options.joins.push({ model_class, type: 'LEFT OUTER JOIN' });
    return this;
  }

  /**
   * Returns only one record (or null if does not exists).
   *
   * This is different from limit(1). limit(1) returns array of length 1 while this returns an instance.
   */
  public one(): this {
    if (!this._current_if) {
      return this;
    }
    this._options.limit = 1;
    this._options.one = true;
    return this;
  }

  /**
   * Sets limit of query
   */
  public limit(limit: number): this {
    if (!this._current_if) {
      return this;
    }
    this._options.limit = limit;
    return this;
  }

  /**
   * Sets skip of query
   */
  public skip(skip: number): this {
    if (!this._current_if) {
      return this;
    }
    this._options.skip = skip;
    return this;
  }

  /**
   * Returns raw instances instead of model instances
   * @see Query::exec
   */
  public lean(lean = true): this {
    if (!this._current_if) {
      return this;
    }
    this._options.lean = lean;
    return this;
  }

  /**
   * Makes a part of the query chain conditional
   * @see Query::endif
   */
  public if(condition: boolean): this {
    this._ifs.push(condition);
    this._current_if = this._current_if && condition;
    return this;
  }

  /**
   * Ends last if
   * @chainable
   * @see Query::if
   */
  public endif() {
    this._ifs.pop();
    this._current_if = true;
    for (const condition of this._ifs) {
      this._current_if = this._current_if && condition;
    }
    return this;
  }

  /**
   * Cache result.
   *
   * If cache of key exists, actual query does not performed.
   * If cache does not exist, query result will be saved in cache.
   *
   * Redis is used to cache.
   */
  public cache(options: QueryOptions['cache']): this {
    if (!this._current_if) {
      return this;
    }
    this._options.cache = options;
    return this;
  }

  /**
   * Returns associated objects also
   */
  public include(column: string, select?: string): this {
    if (!this._current_if) {
      return this;
    }
    this._includes.push({ column, select });
    return this;
  }

  public transaction(transaction?: Transaction): this {
    this._options.transaction = transaction;
    return this;
  }

  public using(node: 'master' | 'read'): this {
    this._options.node = node;
    return this;
  }

  public index_hint(hint: string): this {
    this._options.index_hint = hint;
    return this;
  }

  /**
   * Executes the query
   * @see AdapterBase::findById
   * @see AdapterBase::find
   */
  public async exec(options?: { skip_log?: boolean }) {
    this._setUsed();
    await this._model._checkReady();
    if (this._options.cache && this._options.cache.key) {
      try {
        // try cache
        return await this._model._loadFromCache(this._options.cache.key, this._options.cache.refresh);
      } catch (error: any) {
        // no cache, execute query
        const records = await this._execAndInclude(options);
        // save result to cache
        await this._model._saveToCache(this._options.cache.key, this._options.cache.ttl, records);
        return records;
      }
    } else {
      return await this._execAndInclude(options);
    }
  }

  /**
   * Executes the query and returns a readable stream
   * @see AdapterBase::findById
   * @see AdapterBase::find
   */
  public stream(): stream.Readable {
    this._setUsed();
    const transformer = new stream.Transform({ objectMode: true });
    transformer._transform = function (chunk, encoding, callback) {
      this.push(chunk);
      callback();
    };
    this._model._checkReady().then(() => {
      this._adapter
        .stream(this._name, this._conditions, this._getAdapterFindOptions())
        .on('error', (error) => {
          transformer.emit('error', error);
        })
        .pipe(transformer);
    });
    return transformer;
  }

  /**
   * Explains the query
   */
  public async explain() {
    this._options.cache = undefined;
    this._options.explain = true;
    this._includes = [];
    return await this.exec({ skip_log: true });
  }

  /**
   * Executes the query as a promise (.then == .exec().then)
   */
  public then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | ((value: T[]) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): PromiseLike<TResult1 | TResult2>;
  public then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }

  /**
   * Executes the query as a count operation
   * @see AdapterBase::count
   */
  public async count(): Promise<number> {
    this._setUsed();
    await this._model._checkReady();
    if (this._id || this._find_single_id) {
      this._conditions.push({ id: this._id });
      delete this._id;
    }
    return await this._adapter.count(this._name, this._conditions, this._options);
  }

  /**
   * Executes the query as a update operation
   * @see AdapterBase::update
   */
  public async update(updates: any): Promise<number> {
    this._setUsed();
    await this._model._checkReady();
    const errors: any[] = [];
    const data = {};
    this._validateAndBuildSaveData(errors, data, updates, '', updates);
    if (errors.length > 0) {
      throw new Error(errors.join(','));
    }
    if (this._id || this._find_single_id) {
      this._conditions.push({ id: this._id });
      delete this._id;
    }
    this._connection.log(this._name, 'update', { data, conditions: this._conditions, options: this._options });
    return await this._adapter.updatePartial(this._name, data, this._conditions, this._options);
  }

  /**
   * Executes the query as an insert or update operation
   * @see AdapterBase::upsert
   */
  public async upsert(updates: any, options?: { ignore_on_update: string[] }): Promise<void> {
    this._setUsed();
    await this._model._checkReady();
    const errors: any[] = [];
    const data = {};
    this._validateAndBuildSaveData(errors, data, updates, '', updates);
    if (errors.length > 0) {
      throw new Error(errors.join(','));
    }
    if (this._id || this._find_single_id) {
      this._conditions.push({ id: this._id });
      delete this._id;
    }
    const default_applied_columns = this._model.applyDefaultValues(data);
    options = {
      ...this._options,
      ignore_on_update: (options?.ignore_on_update ?? []).concat(default_applied_columns),
    };
    this._connection.log(this._name, 'upsert', { data, conditions: this._conditions, options });
    return await this._adapter.upsert(this._name, data, this._conditions, options);
  }

  /**
   * Executes the query as a delete operation
   * @see AdapterBase::delete
   */
  public async delete(options?: any): Promise<number> {
    this._setUsed();
    await this._model._checkReady();
    if (this._id || this._find_single_id) {
      this._conditions.push({ id: this._id });
      delete this._id;
    }
    if (!(options && options.skip_log)) {
      this._connection.log(this._name, 'delete', { conditions: this._conditions });
    }
    await this._doArchiveAndIntegrity(options);
    return await this._adapter.delete(this._name, this._conditions, { transaction: this._options.transaction });
  }

  private async _exec(find_options: AdapterFindOptions, options?: { skip_log?: boolean }) {
    if (this._find_single_id && this._conditions.length === 0) {
      if (!(options && options.skip_log)) {
        this._connection.log(this._name, 'find by id', { id: this._id, options: find_options });
      }
      if (!this._id) {
        throw new Error('not found');
      }
      let record;
      try {
        record = await this._adapter.findById(this._name, this._id, find_options);
      } catch (error: any) {
        throw new Error('not found');
      }
      if (!record) {
        throw new Error('not found');
      }
      return record;
    }
    let expected_count: number | undefined;
    if (this._id || this._find_single_id) {
      if (Array.isArray(this._id)) {
        if (this._id.length === 0) {
          return [];
        }
        this._conditions.push({ id: { $in: this._id } });
        expected_count = this._id.length;
      } else {
        this._conditions.push({ id: this._id });
        expected_count = 1;
      }
    }
    if (!(options && options.skip_log)) {
      this._connection.log(this._name, 'find', { conditions: this._conditions, options: find_options });
    }
    let records = await this._adapter.find(this._name, this._conditions, find_options);
    if (expected_count != null) {
      if (records.length !== expected_count) {
        throw new Error('not found');
      }
    }
    if (this._preserve_order_ids) {
      records = this._preserve_order_ids.map((id) => {
        for (const record of records) {
          if (record.id === id) {
            return record;
          }
        }
      });
    }
    if (this._options.one) {
      if (records.length > 1) {
        throw new Error('unknown error');
      }
      if (records.length === 1) {
        return records[0];
      } else {
        return null;
      }
    } else {
      return records;
    }
  }

  private _getAdapterFindOptions(): AdapterFindOptions {
    const select: string[] = [];
    const select_raw: string[] = [];
    if (this._options.select_columns) {
      const schema_columns = Object.keys(this._model._schema);
      const intermediate_paths = this._model._intermediate_paths;
      this._options.select_columns.forEach((column) => {
        if (schema_columns.indexOf(column) >= 0) {
          select.push(column);
          select_raw.push(column);
        } else if (intermediate_paths[column]) {
          // select all nested columns
          select_raw.push(column);
          column += '.';
          schema_columns.forEach((sc) => {
            if (sc.startsWith(column)) {
              select.push(sc);
            }
          });
        }
      });
    }

    let group_by: string[] | undefined;
    if (this._options.group_by) {
      group_by = this._options.group_by
        .map((column) => {
          return this._model._schema[column]._dbname_us;
        })
        .filter((column) => column != null);
    }

    const orders: string[] = [];
    if (typeof this._options.orders === 'string') {
      const avaliable_columns = ['id'];
      avaliable_columns.push(...Object.keys(this._model._schema));
      if (this._options.group_fields) {
        avaliable_columns.push(...Object.keys(this._options.group_fields));
      }
      this._options.orders.split(/\s+/).forEach((order) => {
        let asc = true;
        if (order.startsWith('-')) {
          asc = false;
          order = order.slice(1);
        }
        if (avaliable_columns.indexOf(order) >= 0) {
          orders.push(asc ? order : '-' + order);
        }
      });
    }

    const joins: Array<{ model_name: string; type: string; alias: string; base_column: string; join_column: string }> =
      [];
    for (const join of this._options.joins) {
      joins.push({
        model_name: join.model_class._name,
        type: join.type,
        alias: join.model_class._name,
        base_column: 'id',
        join_column: foreign_key(this._model._name),
      });
    }

    return {
      conditions_of_group: this._options.conditions_of_group,
      explain: this._options.explain,
      group_by,
      group_fields: this._options.group_fields,
      joins,
      lean: this._options.lean,
      limit: this._options.limit,
      near: this._options.near,
      node: this._options.node,
      index_hint: this._options.index_hint,
      orders,
      skip: this._options.skip,
      transaction: this._options.transaction,
      ...(select_raw.length > 0 && { select, select_raw }),
    };
  }

  private async _execAndInclude(options?: { skip_log?: boolean }) {
    const records = await this._exec(this._getAdapterFindOptions(), options);
    if (this._options.select_single) {
      if (Array.isArray(records)) {
        return _.map(records, this._options.select_columns![0]);
      } else {
        if (records) {
          return records[this._options.select_columns![0]];
        } else {
          return null;
        }
      }
    }
    await Promise.all(
      this._includes.map(async (include) => {
        await this._connection.fetchAssociated(records, include.column, include.select, {
          lean: this._options.lean,
          model: this._model,
          transaction: this._options.transaction,
        });
      }),
    );
    return records;
  }

  private _validateAndBuildSaveData(errors: any, data: any, updates: any, path: any, object: any) {
    const model = this._model;
    const schema = model._schema;
    for (let column in object) {
      const property = schema[path + column];
      if (property) {
        try {
          model._validateColumn(updates, path + column, property, true);
        } catch (error: any) {
          errors.push(error.message);
        }
        model._buildSaveDataColumn(data, updates, path + column, property, true);
      } else if (!object[column] && model._intermediate_paths[column]) {
        // set all nested columns null
        column += '.';
        const temp: any = {};
        Object.keys(schema).forEach((sc) => {
          if (sc.startsWith(column)) {
            temp[sc.substr(column.length)] = null;
          }
        });
        this._validateAndBuildSaveData(errors, data, updates, path + column, temp);
      } else if (typeof object[column] === 'object') {
        this._validateAndBuildSaveData(errors, data, updates, path + column + '.', object[column]);
      }
    }
  }

  private async _doIntegrityActions(integrities: any, ids: any) {
    const promises = integrities.map(async (integrity: any) => {
      if (integrity.type === 'parent_nullify') {
        await integrity.child.update(_.zipObject([integrity.column], [null]), _.zipObject([integrity.column], [ids]));
      } else if (integrity.type === 'parent_restrict') {
        const count = await integrity.child.count(_.zipObject([integrity.column], [ids]));
        if (count > 0) {
          throw new Error('rejected');
        }
      } else if (integrity.type === 'parent_delete') {
        await integrity.child.delete(_.zipObject([integrity.column], [ids]));
      }
    });
    await Promise.all(promises);
  }

  private async _doArchiveAndIntegrity(options: any) {
    const need_archive = this._model.archive;
    const integrities = this._model._integrities.filter((integrity) => integrity.type.substr(0, 7) === 'parent_');
    const need_child_archive = integrities.some((integrity) => integrity.child.archive);
    const need_integrity = need_child_archive || (integrities.length > 0 && !this._adapter.native_integrity);
    if (!need_archive && !need_integrity) {
      return;
    }
    // find all records to be deleted
    const query = this._model.where(this._conditions);
    if (!need_archive) {
      // we need only id field for integrity
      query.select('');
    }
    const records: any[] = await query.exec({ skip_log: options && options.skip_log });
    if (need_archive) {
      const archive_records: any[] = records.map((record) => {
        return { model: this._name, data: record };
      });
      await this._connection.models._Archive.createBulk(archive_records);
    }
    if (!need_integrity) {
      return;
    }
    if (records.length === 0) {
      return;
    }
    const ids = records.map((record) => record.id);
    await this._doIntegrityActions(integrities, ids);
  }

  private _addCondition(condition: any) {
    if (this._options.group_fields) {
      const keys = Object.keys(condition);
      if (keys.length === 1 && Object.prototype.hasOwnProperty.call(this._options.group_fields, keys[0])) {
        this._options.conditions_of_group.push(condition);
      }
    } else {
      this._conditions.push(condition);
    }
  }

  private _setUsed() {
    if (this._used) {
      throw new Error('Query object is already used');
    }
    this._used = true;
  }
}

export { Query };
