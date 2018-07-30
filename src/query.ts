import * as _ from 'lodash';
import * as stream from 'stream';

import { AdapterBase } from './adapters/base';
import { Connection } from './connection';
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
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): PromiseLike<TResult1 | TResult2>;
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
  then<TResult1 = T[], TResult2 = never>(
    onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): PromiseLike<TResult1 | TResult2>;
  count(): PromiseLike<number>;
  update(updates: object): PromiseLike<number>;
  upsert(updates: object): PromiseLike<number>;
  delete(): PromiseLike<number>;
}

export interface QueryOptions {
  cache: {
    key: string,
    ttl: number,
    refresh?: boolean,
  };
}

/**
 * Collects conditions to query
 */
class Query<T> {
  private _model: typeof Model;
  private _name: string;
  private _connection: Connection;
  private _adapter: AdapterBase;
  private _ifs: boolean[];
  private _current_if: boolean;
  private _options: QueryOptions;

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
   * @chainable
   */
  public find(id: RecordID | RecordID[]): Query<T> {
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
   * @chainable
   */
  public findPreserve(ids: RecordID[]): Query<T> {
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
   * @chainable
   */
  public near(target: object) {
    if (!this._current_if) {
      return this;
    }
    this._options.near = target;
    return this;
  }

  /**
   * Finds records by condition
   * @chainable
   */
  public where(condition?: object) {
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
   * @chainable
   */
  public select(columns: string) {
    var intermediate_paths, schema_columns, select, select_raw;
    if (!this._current_if) {
      return this;
    }
    this._options.select = null;
    this._options.select_raw = null;
    if (typeof columns === 'string') {
      schema_columns = Object.keys(this._model._schema);
      intermediate_paths = this._model._intermediate_paths;
      select = [];
      select_raw = [];
      columns.split(/\s+/).forEach(function(column) {
        if (schema_columns.indexOf(column) >= 0) {
          select.push(column);
          return select_raw.push(column);
        } else if (intermediate_paths[column]) {
          // select all nested columns
          select_raw.push(column);
          column += '.';
          return schema_columns.forEach(function(sc) {
            if (sc.indexOf(column) === 0) {
              return select.push(sc);
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
   * @chainable
   */
  public order(orders: string) {
    var avaliable_columns;
    if (!this._current_if) {
      return this;
    }
    if (typeof orders === 'string') {
      avaliable_columns = ['id'];
      [].push.apply(avaliable_columns, Object.keys(this._model._schema));
      if (this._options.group_fields) {
        [].push.apply(avaliable_columns, Object.keys(this._options.group_fields));
      }
      orders.split(/\s+/).forEach((order) => {
        var asc;
        asc = true;
        if (order[0] === '-') {
          asc = false;
          order = order.slice(1);
        }
        if (avaliable_columns.indexOf(order) >= 0) {
          return this._options.orders.push(asc ? order : '-' + order);
        }
      });
    }
    return this;
  }

  /**
   * Groups result records
   * @chainable
   */
  public group<U = T>(group_by: string | null, fields: object) {
    var columns, schema_columns;
    if (!this._current_if) {
      return this;
    }
    this._options.group_by = null;
    schema_columns = Object.keys(this._model._schema);
    if (typeof group_by === 'string') {
      columns = group_by.split(/\s+/).filter(function(column) {
        return schema_columns.indexOf(column) >= 0;
      });
      this._options.group_by = columns;
    }
    this._options.group_fields = fields;
    return this;
  }

  /**
   * Returns only one record (or null if does not exists).
   *
   * This is different from limit(1). limit(1) returns array of length 1 while this returns an instance.
   * @chainable
   */
  public one() {
    if (!this._current_if) {
      return this;
    }
    this._options.limit = 1;
    this._options.one = true;
    return this;
  }

  /**
   * Sets limit of query
   * @chainable
   */
  public limit(limit: number) {
    if (!this._current_if) {
      return this;
    }
    this._options.limit = limit;
    return this;
  }

  /**
   * Sets skip of query
   * @chainable
   */
  public skip(skip: number) {
    if (!this._current_if) {
      return this;
    }
    this._options.skip = skip;
    return this;
  }

  /**
   * Returns raw instances instead of model instances
   * @chainable
   * @see Query::exec
   */
  public lean(lean = true) {
    if (!this._current_if) {
      return this;
    }
    this._options.lean = lean;
    return this;
  }

  /**
   * Makes a part of the query chain conditional
   * @chainable
   * @see Query::endif
   */
  public if(condition: boolean) {
    this._ifs.push(condition);
    this._current_if && (this._current_if = condition);
    return this;
  }

  /**
   * Ends last if
   * @chainable
   * @see Query::if
   */
  public endif() {
    var condition, i, len, ref;
    this._ifs.pop();
    this._current_if = true;
    ref = this._ifs;
    for (i = 0, len = ref.length; i < len; i++) {
      condition = ref[i];
      this._current_if && (this._current_if = condition);
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
   * @param {Object} options
   * @param {String} options.key
   * @param {Number} options.ttl TTL in seconds
   * @param {Boolean} options.refresh don't load from cache if true
   * @chainable
   */
  public cache(options: QueryOptions['cache']) {
    if (!this._current_if) {
      return this;
    }
    this._options.cache = options;
    return this;
  }

  /**
   * Returns associated objects also
   * @param {String} column
   * @param {String} [select]
   * @chainable
   */
  public include(column, select) {
    if (!this._current_if) {
      return this;
    }
    this._includes.push({
      column: column,
      select: select
    });
    return this;
  }

  /**
   * Executes the query
   * @param {Object} [options]
   * @param {Boolean} [options.skip_log=false]
   * @return {Model|Array<Model>}
   * @promise
   * @see AdapterBase::findById
   * @see AdapterBase::find
   */
  public async exec(options?) {
    await this._model._checkReady();
    if (this._options.cache && this._options.cache.key) {
      try {
        // try cache
        return await this._model._loadFromCache(this._options.cache.key, this._options.cache.refresh);
      } catch (error) {
        // no cache, execute query
        const records = (await this._execAndInclude(options));
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
   * @param {Object} [options]
   * @param {Boolean} [options.skip_log=false]
   * @return {Readable}
   * @see AdapterBase::findById
   * @see AdapterBase::find
   */
  public stream() {
    var transformer;
    transformer = new stream.Transform({
      objectMode: true
    });
    transformer._transform = function(chunk, encoding, callback) {
      this.push(chunk);
      return callback();
    };
    this._model._checkReady().then(() => {
      return this._adapter.stream(this._name, this._conditions, this._options).on('error', function(error) {
        return transformer.emit('error', error);
      }).pipe(transformer);
    });
    return transformer;
  }

  /**
   * Explains the query
   * @return {Object}
   * @promise
   */
  public async explain() {
    this._options.cache = null;
    this._options.explain = true;
    this._includes = [];
    return (await this.exec({
      skip_log: true
    }));
  }

  /**
   * Executes the query as a promise (.then == .exec().then)
   * @param {Function} fulfilled
   * @param {Function} rejected
   * @promise
   */
  public then(fulfilled, rejected) {
    return this.exec().then(fulfilled, rejected);
  }

  /**
   * Executes the query as a count operation
   * @return {Number}
   * @promise
   * @see AdapterBase::count
   */
  public async count() {
    await this._model._checkReady();
    if (this._id || this._find_single_id) {
      this._conditions.push({
        id: this._id
      });
      delete this._id;
    }
    return (await this._adapter.count(this._name, this._conditions, this._options));
  }

  /**
   * Executes the query as a update operation
   * @param {Object} updates
   * @return {Number}
   * @promise
   * @see AdapterBase::count
   */
  public async update(updates): Promise<number> {
    var data, errors;
    await this._model._checkReady();
    errors = [];
    data = {};
    this._validateAndBuildSaveData(errors, data, updates, '', updates);
    if (errors.length > 0) {
      throw new Error(errors.join(','));
    }
    if (this._id || this._find_single_id) {
      this._conditions.push({
        id: this._id
      });
      delete this._id;
    }
    this._connection.log(this._name, 'update', {
      data: data,
      conditions: this._conditions,
      options: this._options
    });
    return (await this._adapter.updatePartial(this._name, data, this._conditions, this._options));
  }

  /**
   * Executes the query as an insert or update operation
   * @param {Object} updates
   * @return {Number}
   * @promise
   * @see AdapterBase::count
   */
  public async upsert(updates): Promise<number> {
    var data, errors;
    await this._model._checkReady();
    errors = [];
    data = {};
    this._validateAndBuildSaveData(errors, data, updates, '', updates);
    if (errors.length > 0) {
      throw new Error(errors.join(','));
    }
    if (this._id || this._find_single_id) {
      this._conditions.push({
        id: this._id
      });
      delete this._id;
    }
    this._connection.log(this._name, 'upsert', {
      data: data,
      conditions: this._conditions,
      options: this._options
    });
    return (await this._adapter.upsert(this._name, data, this._conditions, this._options));
  }

  /**
   * Executes the query as a delete operation
   * @param {Object} [options]
   * @param {Boolean} [options.skip_log=false]
   * @return {Number}
   * @promise
   * @see AdapterBase::delete
   */
  public async delete(options?): Promise<number> {
    await this._model._checkReady();
    if (this._id || this._find_single_id) {
      this._conditions.push({
        id: this._id
      });
      delete this._id;
    }
    if (!(options != null ? options.skip_log : void 0)) {
      this._connection.log(this._name, 'delete', {
        conditions: this._conditions
      });
    }
    await this._doArchiveAndIntegrity(options);
    return (await this._adapter.delete(this._name, this._conditions));
  }

  private async _exec(options) {
    var error, expected_count, record, records;
    if (this._find_single_id && this._conditions.length === 0) {
      if (!(options != null ? options.skip_log : void 0)) {
        this._connection.log(this._name, 'find by id', {
          id: this._id,
          options: this._options
        });
      }
      if (!this._id) {
        throw new Error('not found');
      }
      try {
        record = (await this._adapter.findById(this._name, this._id, this._options));
      } catch (error1) {
        error = error1;
        throw new Error('not found');
      }
      if (!record) {
        throw new Error('not found');
      }
      return record;
    }
    expected_count = void 0;
    if (this._id || this._find_single_id) {
      if (Array.isArray(this._id)) {
        if (this._id.length === 0) {
          return [];
        }
        this._conditions.push({
          id: {
            $in: this._id
          }
        });
        expected_count = this._id.length;
      } else {
        this._conditions.push({
          id: this._id
        });
        expected_count = 1;
      }
    }
    if (!(options != null ? options.skip_log : void 0)) {
      this._connection.log(this._name, 'find', {
        conditions: this._conditions,
        options: this._options
      });
    }
    records = (await this._adapter.find(this._name, this._conditions, this._options));
    if (expected_count != null) {
      if (records.length !== expected_count) {
        throw new Error('not found');
      }
    }
    if (this._preserve_order_ids) {
      records = this._preserve_order_ids.map(function(id) {
        var i, len;
        for (i = 0, len = records.length; i < len; i++) {
          record = records[i];
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

  private async _execAndInclude(options) {
    var records;
    records = (await this._exec(options));
    await Promise.all(this._includes.map(async (include) => {
      return (await this._connection.fetchAssociated(records, include.column, include.select, {
        model: this._model,
        lean: this._options.lean
      }));
    }));
    return records;
  }

  private _validateAndBuildSaveData(errors, data, updates, path, object) {
    var column, error, model, property, schema, temp;
    model = this._model;
    schema = model._schema;
    for (column in object) {
      property = schema[path + column];
      if (property) {
        try {
          model._validateColumn(updates, path + column, property, true);
        } catch (error1) {
          error = error1;
          errors.push(error);
        }
        model._buildSaveDataColumn(data, updates, path + column, property, true);
      } else if (!object[column] && model._intermediate_paths[column]) {
        // set all nested columns null
        column += '.';
        temp = {};
        Object.keys(schema).forEach(function(sc) {
          if (sc.indexOf(column) === 0) {
            return temp[sc.substr(column.length)] = null;
          }
        });
        this._validateAndBuildSaveData(errors, data, updates, path + column, temp);
      } else if (typeof object[column] === 'object') {
        this._validateAndBuildSaveData(errors, data, updates, path + column + '.', object[column]);
      }
    }
  }

  private async _doIntegrityActions(integrities, ids) {
    var promises;
    promises = integrities.map(async (integrity) => {
      var count;
      if (integrity.type === 'parent_nullify') {
        return (await integrity.child.update(_.zipObject([integrity.column], [null]), _.zipObject([integrity.column], [ids])));
      } else if (integrity.type === 'parent_restrict') {
        count = (await integrity.child.count(_.zipObject([integrity.column], [ids])));
        if (count > 0) {
          throw new Error('rejected');
        }
      } else if (integrity.type === 'parent_delete') {
        return (await integrity.child.delete(_.zipObject([integrity.column], [ids])));
      }
    });
    return (await Promise.all(promises));
  }

  private async _doArchiveAndIntegrity(options) {
    var archive_records, ids, integrities, need_archive, need_child_archive, need_integrity, query, records;
    need_archive = this._model.archive;
    integrities = this._model._integrities.filter(function(integrity) {
      return integrity.type.substr(0, 7) === 'parent_';
    });
    need_child_archive = integrities.some((integrity) => {
      return integrity.child.archive;
    });
    need_integrity = need_child_archive || (integrities.length > 0 && !this._adapter.native_integrity);
    if (!need_archive && !need_integrity) {
      return;
    }
    // find all records to be deleted
    query = this._model.where(this._conditions);
    if (!need_archive) { // we need only id field for integrity
      query.select('');
    }
    records = (await query.exec({
      skip_log: options != null ? options.skip_log : void 0
    }));
    if (need_archive) {
      archive_records = records.map((record) => {
        return {
          model: this._name,
          data: record
        };
      });
      await this._connection.models['_Archive'].createBulk(archive_records);
    }
    if (!need_integrity) {
      return;
    }
    if (records.length === 0) {
      return;
    }
    ids = records.map(function(record) {
      return record.id;
    });
    await this._doIntegrityActions(integrities, ids);
  }

  private _addCondition(condition) {
    var keys;
    if (this._options.group_fields) {
      keys = Object.keys(condition);
      if (keys.length === 1 && this._options.group_fields.hasOwnProperty(keys[0])) {
        this._options.conditions_of_group.push(condition);
        return;
      }
    }
    return this._conditions.push(condition);
  }
}

export { Query };
