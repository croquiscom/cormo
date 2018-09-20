import * as _ from 'lodash';
import * as stream from 'stream';

import { AdapterBase } from './adapters/base';
import { Connection } from './connection';
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
    key: string,
    ttl: number,
    refresh?: boolean,
  };
}

export interface IQuerySingle<T> extends PromiseLike<T> {
  find(id: RecordID): IQuerySingle<T>;
  find(id: RecordID[]): IQueryArray<T>;
  findPreserve(id: RecordID[]): IQueryArray<T>;
  near(target: object): IQuerySingle<T>;
  where(condition?: object): IQuerySingle<T>;
  select<K extends Exclude<keyof T, Exclude<keyof Model, 'id'>>>(columns: string): IQuerySingle<Pick<T, K>>;
  order(orders: string): IQuerySingle<T>;
  group<U = T>(group_by: string | null, fields: object): IQuerySingle<U>;
  one(): IQuerySingle<T>;
  limit(limit?: number): IQuerySingle<T>;
  skip(skip?: number): IQuerySingle<T>;
  lean(lean?: boolean): IQuerySingle<T>;
  if(condition: boolean): IQuerySingle<T>;
  endif(): IQuerySingle<T>;
  cache(options: IQueryOptions['cache']): IQuerySingle<T>;
  include(column: string, select?: string): IQuerySingle<T>;

  exec(options?: any): PromiseLike<T>;
  stream(): stream.Readable;
  explain(): PromiseLike<any>;
  count(): PromiseLike<number>;
  update(updates: object): PromiseLike<number>;
  upsert(updates: object): PromiseLike<void>;
  delete(options?: any): PromiseLike<number>;
}

export interface IQueryArray<T> extends PromiseLike<T[]> {
  find(id: RecordID): IQuerySingle<T>;
  find(id: RecordID[]): IQueryArray<T>;
  findPreserve(id: RecordID[]): IQueryArray<T>;
  near(target: object): IQueryArray<T>;
  where(condition?: object): IQueryArray<T>;
  select<K extends Exclude<keyof T, Exclude<keyof Model, 'id'>>>(columns: string): IQueryArray<Pick<T, K>>;
  order(orders: string): IQueryArray<T>;
  group<U = T>(group_by: string | null, fields: object): IQueryArray<U>;
  one(): IQuerySingle<T>;
  limit(limit?: number): IQueryArray<T>;
  skip(skip?: number): IQueryArray<T>;
  lean(lean?: boolean): IQueryArray<T>;
  if(condition: boolean): IQueryArray<T>;
  endif(): IQueryArray<T>;
  cache(options: IQueryOptions['cache']): IQueryArray<T>;
  include(column: string, select?: string): IQueryArray<T>;

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
class Query<T> implements IQuerySingle<T>, IQueryArray<T> {
  private _model: typeof Model;
  private _name: string;
  private _connection: Connection;
  private _adapter: AdapterBase;
  private _ifs: boolean[];
  private _current_if: boolean;
  private _options: IQueryOptions;
  private _conditions: any[];
  private _includes: any[];
  private _id: any;
  private _find_single_id = false;
  private _preserve_order_ids?: any[];

  /**
   * Creates a query instance
   */
  constructor(model: typeof Model) {
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
      orders: [],
    };
  }

  /**
   * Finds a record by id
   */
  public find(id: RecordID): IQuerySingle<T>;
  public find(id: RecordID[]): IQueryArray<T>;
  public find(id: RecordID | RecordID[]): this {
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
  public findPreserve(ids: RecordID[]): IQueryArray<T> {
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
        return this._addCondition(cond);
      });
    } else if (condition != null) {
      this._addCondition(condition);
    }
    return this;
  }

  /**
   * Selects columns for result
   */
  public select<K extends keyof T>(columns: string): IQuerySingle<Pick<T, K>>;
  public select<K extends keyof T>(columns: string): IQueryArray<Pick<T, K>>;
  public select<K extends keyof T>(columns: string): IQuerySingle<Pick<T, K>> | IQueryArray<Pick<T, K>> {
    if (!this._current_if) {
      return this;
    }
    this._options.select = null;
    this._options.select_raw = null;
    if (typeof columns === 'string') {
      const schema_columns = Object.keys(this._model._schema);
      const intermediate_paths = this._model._intermediate_paths;
      const select: any[] = [];
      const select_raw: any[] = [];
      columns.split(/\s+/).forEach((column) => {
        if (schema_columns.indexOf(column) >= 0) {
          select.push(column);
          select_raw.push(column);
        } else if (intermediate_paths[column]) {
          // select all nested columns
          select_raw.push(column);
          column += '.';
          schema_columns.forEach((sc) => {
            if (sc.indexOf(column) === 0) {
              select.push(sc);
            }
          });
        }
      });
      this._options.select = select;
      this._options.select_raw = select_raw;
    }
    return this;
  }

  /**
   * Specifies orders of result
   */
  public order(orders: string): this {
    if (!this._current_if) {
      return this;
    }
    if (typeof orders === 'string') {
      const avaliable_columns = ['id'];
      [].push.apply(avaliable_columns, Object.keys(this._model._schema));
      if (this._options.group_fields) {
        [].push.apply(avaliable_columns, Object.keys(this._options.group_fields));
      }
      orders.split(/\s+/).forEach((order) => {
        let asc = true;
        if (order[0] === '-') {
          asc = false;
          order = order.slice(1);
        }
        if (avaliable_columns.indexOf(order) >= 0) {
          this._options.orders.push(asc ? order : '-' + order);
        }
      });
    }
    return this;
  }

  /**
   * Groups result records
   */
  public group<U = T>(group_by: string | null, fields: object): IQuerySingle<U>;
  public group<U = T>(group_by: string | null, fields: object): IQueryArray<U>;
  public group<U = T>(group_by: string | null, fields: object): IQuerySingle<U> | IQueryArray<U> {
    if (!this._current_if) {
      return this as any;
    }
    this._options.group_by = null;
    const schema_columns = Object.keys(this._model._schema);
    if (typeof group_by === 'string') {
      const columns = group_by.split(/\s+/).filter((column) => {
        return schema_columns.indexOf(column) >= 0;
      });
      this._options.group_by = columns;
    }
    this._options.group_fields = fields;
    return this as any;
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
  public cache(options: IQueryOptions['cache']): this {
    if (!this._current_if) {
      return this;
    }
    this._options.cache = options;
    return this;
  }

  /**
   * Returns associated objects also
   */
  public include(column: any, select: any): this {
    if (!this._current_if) {
      return this;
    }
    this._includes.push({ column, select });
    return this;
  }

  /**
   * Executes the query
   * @see AdapterBase::findById
   * @see AdapterBase::find
   */
  public async exec(options?: any) {
    await this._model._checkReady();
    if (this._options.cache && this._options.cache.key) {
      try {
        // try cache
        return await this._model._loadFromCache(this._options.cache.key, this._options.cache.refresh);
      } catch (error) {
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
    const transformer = new stream.Transform({ objectMode: true });
    transformer._transform = function(chunk, encoding, callback) {
      this.push(chunk);
      callback();
    };
    this._model._checkReady().then(() => {
      this._adapter.stream(this._name, this._conditions, this._options)
        .on('error', (error) => {
          transformer.emit('error', error);
        }).pipe(transformer);
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
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) |
      ((value: T[]) => TResult1 | PromiseLike<TResult1>) | undefined | null,
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
  public async upsert(updates: any): Promise<void> {
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
    this._connection.log(this._name, 'upsert', { data, conditions: this._conditions, options: this._options });
    return await this._adapter.upsert(this._name, data, this._conditions, this._options);
  }

  /**
   * Executes the query as a delete operation
   * @see AdapterBase::delete
   */
  public async delete(options?: any): Promise<number> {
    await this._model._checkReady();
    if (this._id || this._find_single_id) {
      this._conditions.push({ id: this._id });
      delete this._id;
    }
    if (!(options != null ? options.skip_log : void 0)) {
      this._connection.log(this._name, 'delete', { conditions: this._conditions });
    }
    await this._doArchiveAndIntegrity(options);
    return await this._adapter.delete(this._name, this._conditions);
  }

  private async _exec(options: any) {
    if (this._find_single_id && this._conditions.length === 0) {
      if (!(options && options.skip_log)) {
        this._connection.log(this._name, 'find by id', { id: this._id, options: this._options });
      }
      if (!this._id) {
        throw new Error('not found');
      }
      let record;
      try {
        record = (await this._adapter.findById(this._name, this._id, this._options));
      } catch (error) {
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
      this._connection.log(this._name, 'find', { conditions: this._conditions, options: this._options });
    }
    let records = await this._adapter.find(this._name, this._conditions, this._options);
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

  private async _execAndInclude(options?: any) {
    const records = await this._exec(options);
    await Promise.all(this._includes.map(async (include) => {
      await this._connection.fetchAssociated(records, include.column, include.select, {
        lean: this._options.lean,
        model: this._model,
      });
    }));
    return records;
  }

  private _validateAndBuildSaveData(errors: any, data: any, updates: any, path: any, object: any) {
    const model: any = this._model;
    const schema = model._schema;
    // tslint:disable-next-line:forin
    for (let column in object) {
      const property = schema[path + column];
      if (property) {
        try {
          model._validateColumn(updates, path + column, property, true);
        } catch (error) {
          errors.push(error.message);
        }
        model._buildSaveDataColumn(data, updates, path + column, property, true);
      } else if (!object[column] && model._intermediate_paths[column]) {
        // set all nested columns null
        column += '.';
        const temp: any = {};
        Object.keys(schema).forEach((sc) => {
          if (sc.indexOf(column) === 0) {
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
        const count = (await integrity.child.count(_.zipObject([integrity.column], [ids])));
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
    if (!need_archive) { // we need only id field for integrity
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
      if (keys.length === 1 && this._options.group_fields.hasOwnProperty(keys[0])) {
        this._options.conditions_of_group.push(condition);
        return;
      }
    }
    return this._conditions.push(condition);
  }
}

export { Query };
