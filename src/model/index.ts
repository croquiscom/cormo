import * as _ from 'lodash';

import { AdapterBase } from '../adapters/base';
import {
  Connection,
  IAssociationBelongsToOptions,
  IAssociationHasManyOptions,
  IAssociationHasOneOptions,
} from '../connection';
import { IQueryArray, IQuerySingle, Query } from '../query';
import * as types from '../types';
import * as util from '../util';
import { tableize } from '../util/inflector';
import * as inflector from '../util/inflector';

type ModelCallbackName = 'create' | 'destroy' | 'find' | 'initialize' | 'save' | 'update' | 'validate';
type ModelCallbackType = 'after' | 'before';
type ModelCallbackMethod = () => void | 'string';

export type ModelColumnNames<T> = Exclude<keyof T, keyof BaseModel>;
export type ModelColumnNamesWithId<T> = Exclude<keyof T, Exclude<keyof BaseModel, 'id'>>;
export type ModelValueObject<T> = Pick<T, ModelColumnNames<T>>;
export type ModelValueObjectWithId<T> = Pick<T, ModelColumnNamesWithId<T>>;

function _pf_isDirty() {
  return true;
}

function _pf_getChanged() {
  return [];
}

function _pf_get(this: any, path: string) {
  return util.getPropertyOfPath(this, path.split('.'));
}

function _pf_getPrevious() { /**/ }

function _pf_set(this: any, path: string, value: any) {
  return util.setPropertyOfPath(this, path.split('.'), value);
}

function _pf_reset() { /**/ }

export interface IColumnProperty {
  type: types.ColumnType | types.ColumnType[];
  array?: boolean;
  required?: boolean;
  unique?: boolean;
  connection?: Connection;
  name?: string;
  default_value?: string | number | (() => string | number);
}

export interface IColumnPropertyInternal extends IColumnProperty {
  type: types.ColumnTypeInternal;
  record_id?: boolean;
  type_class: types.ColumnTypeInternalConstructor;
  _parts: string[];
  _parts_db: string[];
  _dbname_dot: string;
  _dbname_us: string;
  primary_key: boolean;
}

export interface IColumnNestedProperty {
  [subcolumn: string]: types.ColumnType | types.ColumnType[] | IColumnProperty | IColumnNestedProperty;
}

export interface IModelSchema {
  [path: string]: types.ColumnType | types.ColumnType[] | IColumnProperty | IColumnNestedProperty;
}

export interface IModelSchemaInternal {
  [path: string]: IColumnPropertyInternal;
}

/**
 * Base class for models
 */
class BaseModel {
  /**
   * Tracks changes of a record if true
   */
  public static dirty_tracking = false;

  /**
   * Archives deleted records in the archive table
   */
  public static archive = false;

  /**
   * Applies the lean option for all queries for this Model
   */
  public static lean_query = false;

  public static table_name: string;

  /**
   * Indicates the connection associated to this model
   */
  public static _connection: Connection;

  /**
   * Indicates the adapter associated to this model
   */
  public static _adapter: AdapterBase;

  public static _name: string;

  public static _schema: IModelSchemaInternal;

  public static _indexes: any[];

  public static _integrities: any[];

  public static _associations: { [column: string]: any };

  public static _initialize_called = false;

  public static _intermediate_paths: any;

  public static _property_decorators: any[];

  public static initialize() { /**/ }

  /**
   * Returns a new model class extending BaseModel
   */
  public static newModel(connection: Connection, name: string, schema: IModelSchema): typeof BaseModel {
    // tslint:disable-next-line:variable-name max-classes-per-file
    const NewModel = class extends BaseModel { };
    NewModel.connection(connection, name);
    // tslint:disable-next-line:forin
    for (const column_name in schema) {
      const property = schema[column_name];
      NewModel.column(column_name, property);
    }
    return NewModel;
  }

  /**
   * Sets a connection of this model
   *
   * If this methods was not called explicitly, this model will use Connection.defaultConnection
   */
  public static connection(connection: Connection, name?: string) {
    if (this.hasOwnProperty('_connection')) {
      throw new Error('Model::connection was called twice');
    }
    if (!name) {
      name = this.name;
    }
    connection.models[name] = this;
    connection[name] = this;
    Object.defineProperty(this, '_connection', { value: connection });
    Object.defineProperty(this, '_adapter', { value: connection._adapter });
    Object.defineProperty(this, '_associations', { value: {} });
    Object.defineProperty(this, '_validators', { value: [] });
    Object.defineProperty(this, '_name', { value: name });
    Object.defineProperty(this, '_schema', { value: {} });
    Object.defineProperty(this, '_intermediate_paths', { value: {} });
    Object.defineProperty(this, '_indexes', { value: [] });
    Object.defineProperty(this, '_integrities', { value: [] });
    if (!this.table_name) {
      this.table_name = tableize(name);
    }
    this.column('id', 'recordid');
  }

  public static _checkConnection() {
    if (this.hasOwnProperty('_connection')) {
      return;
    }
    if (Connection.defaultConnection == null) {
      throw new Error('Create a Connection before creating a Model');
    }
    return this.connection(Connection.defaultConnection);
  }

  public static async _checkReady() {
    this._checkConnection();
    await Promise.all([this._connection._checkSchemaApplied(), this._connection._promise_connection]);
  }

  /**
   * Adds a column to this model
   */
  public static column(
    path: string, type_or_property: types.ColumnType | types.ColumnType[] | IColumnProperty | IColumnNestedProperty,
  ): void;
  public static column(path: string, type_or_property: any) {
    this._checkConnection();
    // nested path
    if (_.isPlainObject(type_or_property) && (!type_or_property.type || type_or_property.type.type)) {
      // tslint:disable-next-line:forin
      for (const subcolumn in type_or_property) {
        const subproperty = type_or_property[subcolumn];
        this.column(path + '.' + subcolumn, subproperty);
      }
      return;
    }
    if (this._schema.hasOwnProperty(path)) {
      // if using association, a column may be defined more than twice (by hasMany and belongsTo, for example)
      // overwrite some properties if given later
      if (type_or_property && type_or_property.required) {
        this._schema[path].required = type_or_property.required;
      }
      return;
    }
    // convert simple type to property object
    if (!_.isPlainObject(type_or_property)) {
      type_or_property = { type: type_or_property };
    }
    if (Array.isArray(type_or_property.type)) {
      type_or_property.array = true;
      type_or_property.type = type_or_property.type[0];
    }
    const property = type_or_property as IColumnPropertyInternal;
    let type = types._toCORMOType(property.type);
    if (type.constructor === types.RecordID) {
      type = this._getKeyType(property.connection);
      property.record_id = true;
    }
    // check supports of GeoPoint
    if (type.constructor === types.GeoPoint && !this._adapter.support_geopoint) {
      throw new Error('this adapter does not support GeoPoint type');
    }
    if (type.constructor === types.String && (type as types.ICormoTypesString).length
      && !this._adapter.support_string_type_with_length) {
      throw new Error('this adapter does not support String type with length');
    }
    const parts = path.split('.');
    for (let i = 0; i < parts.length - 1; i++) {
      this._intermediate_paths[parts.slice(0, i + 1).join('.')] = 1;
    }
    property.type = type;
    property.type_class = type.constructor as types.ColumnTypeInternalConstructor;
    property._parts = parts;
    property._parts_db = (property.name || path).split('.');
    property._dbname_dot = property.name || path;
    property._dbname_us = (property.name || path).replace(/\./g, '_');
    property.primary_key = path === 'id';
    this._schema[path] = property;
    if (property.unique) {
      this._indexes.push({
        columns: _.zipObject([property._dbname_us], [1]),
        options: {
          name: property._dbname_us,
          required: property.required,
          unique: true,
        },
      });
    }
    this._connection._schema_changed = true;
  }

  /**
   * Adds an index to this model
   */
  public static index(columns: { [column: string]: 1 | -1 }, options: { name?: string, unique?: boolean } = {}) {
    this._checkConnection();
    if (!options.name) {
      options.name = Object.keys(columns).join('_');
    }
    this._indexes.push({ columns, options });
    this._connection._schema_changed = true;
  }

  /**
   * Drops this model from the database
   * @see AdapterBase::drop
   */
  public static async drop() {
    try {
      // do not need to apply schema before drop, only waiting connection established
      await this._connection._promise_connection;
      await this._adapter.drop(this._name);
    } finally {
      this._connection._schema_changed = true;
    }
  }

  /**
   * Creates a record.
   * 'Model.build(data)' is the same as 'new Model(data)'
   */
  public static build<T extends BaseModel>(
    this: { new(data?: any): T },
    data?: ModelValueObject<T>,
  ): T {
    return new this(data);
  }

  /**
   * Deletes all records from the database
   */
  public static async deleteAll() {
    await this.delete();
  }

  /**
   * Adds a has-many association
   */
  public static hasMany(target_model_or_column: string | typeof BaseModel, options?: IAssociationHasManyOptions) {
    this._checkConnection();
    this._connection.addAssociation({ type: 'hasMany', this_model: this, target_model_or_column, options });
  }

  /**
   * Adds a has-one association
   */
  public static hasOne(target_model_or_column: string | typeof BaseModel, options?: IAssociationHasOneOptions) {
    this._checkConnection();
    this._connection.addAssociation({ type: 'hasOne', this_model: this, target_model_or_column, options });
  }

  /**
   * Adds a belongs-to association
   */
  public static belongsTo(target_model_or_column: string | typeof BaseModel, options?: IAssociationBelongsToOptions) {
    this._checkConnection();
    this._connection.addAssociation({ type: 'belongsTo', this_model: this, target_model_or_column, options });
  }

  public static inspect(depth: number) {
    const schema = Object.keys(this._schema || {}).sort()
      .map((column) => `${column}: ${this._schema[column].type}`)
      .join(', ');
    return '\u001b[36m' + `[Model: ${this.name}(` + '\u001b[90m' + schema + '\u001b[36m' + ')]' + '\u001b[39m';
  }

  public static _getKeyType(target_connection = this._connection) {
    if (this._connection === target_connection && target_connection._adapter.key_type_internal) {
      return new target_connection._adapter.key_type_internal();
    } else {
      return new target_connection._adapter.key_type();
    }
  }

  /**
   * Set nested object null if all children are null
   */
  public static _collapseNestedNulls(instance: any, selected_columns_raw: any, intermediates: any) {
    for (const path of Object.keys(this._intermediate_paths)) {
      if (selected_columns_raw && selected_columns_raw.indexOf(path) === -1) {
        continue;
      }
      let obj;
      let last: any;
      if (intermediates) {
        obj = intermediates;
        last = path;
      } else {
        [obj, last] = util.getLeafOfPath(instance, path);
      }
      let has_non_null = false;
      // tslint:disable-next-line:forin
      for (const key in obj[last]) {
        const value = obj[last][key];
        if (value != null) {
          has_non_null = true;
        }
      }
      if (!has_non_null) {
        obj[last] = null;
      }
    }
  }

  public static async _loadFromCache(key: string, refresh?: boolean): Promise<any> {
    if (refresh) {
      throw new Error('error');
    }
    const redis = await this._connection._connectRedisCache();
    key = 'CC.' + tableize(this._name) + ':' + key;
    const value = await new Promise<string>((resolve, reject) => {
      redis.get(key, (error: Error, v: string) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(v);
      });
    });
    if (value == null) {
      throw new Error('error');
    }
    return JSON.parse(value);
  }

  public static async _saveToCache(key: string, ttl: number, data: any) {
    const redis = await this._connection._connectRedisCache();
    key = 'CC.' + tableize(this._name) + ':' + key;
    await new Promise((resolve, reject) => {
      redis.setex(key, ttl, JSON.stringify(data), (error: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  public static async removeCache(key: string) {
    const redis = await this._connection._connectRedisCache();
    key = 'CC.' + tableize(this._name) + ':' + key;
    await new Promise((resolve) => {
      redis.del(key, () => {
        resolve();
      });
    });
  }

  /**
   * Adds a callback of after initializing
   */
  public static afterInitialize(method: ModelCallbackMethod) {
    this.addCallback('after', 'initialize', method);
  }

  /**
   * Adds a callback of after finding
   */
  public static afterFind(method: ModelCallbackMethod) {
    this.addCallback('after', 'find', method);
  }

  /**
   * Adds a callback of before saving
   */
  public static beforeSave(method: ModelCallbackMethod) {
    this.addCallback('before', 'save', method);
  }

  /**
   * Adds a callback of after saving
   */
  public static afterSave(method: ModelCallbackMethod) {
    this.addCallback('after', 'save', method);
  }

  /**
   * Adds a callback of before creating
   */
  public static beforeCreate(method: ModelCallbackMethod) {
    this.addCallback('before', 'create', method);
  }

  /**
   * Adds a callback of after creating
   */
  public static afterCreate(method: ModelCallbackMethod) {
    this.addCallback('after', 'create', method);
  }

  /**
   * Adds a callback of before updating
   */
  public static beforeUpdate(method: ModelCallbackMethod) {
    this.addCallback('before', 'update', method);
  }

  /**
   * Adds a callback of after updating
   */
  public static afterUpdate(method: ModelCallbackMethod) {
    this.addCallback('after', 'update', method);
  }

  /**
   * Adds a callback of before destroying
   */
  public static beforeDestroy(method: ModelCallbackMethod) {
    this.addCallback('before', 'destroy', method);
  }

  /**
   * Adds a callback of after destroying
   */
  public static afterDestroy(method: ModelCallbackMethod) {
    this.addCallback('after', 'destroy', method);
  }

  /**
   * Adds a callback of before validating
   */
  public static beforeValidate(method: ModelCallbackMethod) {
    this.addCallback('before', 'validate', method);
  }

  /**
   * Adds a callback of after validating
   */
  public static afterValidate(method: ModelCallbackMethod) {
    this.addCallback('after', 'validate', method);
  }

  /**
   * Creates a record and saves it to the database
   * 'Model.create(data)' is the same as 'Model.build(data).save()'
   */
  public static async create<T extends BaseModel>(
    this: { new(data?: any): T } & typeof BaseModel,
    data?: ModelValueObject<T>,
    options?: { skip_log: boolean },
  ): Promise<T> {
    await this._checkReady();
    return await this.build<T>(data).save(options);
  }

  /**
   * Creates multiple records and saves them to the database.
   */
  public static async createBulk<T extends BaseModel>(
    this: { new(data?: any): T } & typeof BaseModel,
    data?: Array<ModelValueObject<T>>,
  ): Promise<T[]> {
    await this._checkReady();
    if (!Array.isArray(data)) {
      throw new Error('data is not an array');
    }
    if (data.length === 0) {
      return [];
    }
    const records = data.map((item) => {
      return this.build(item);
    });
    await Promise.all(records.map((record) => record.validate()));
    for (const record of records) {
      record._runCallbacks('save', 'before');
    }
    for (const record of records) {
      record._runCallbacks('create', 'before');
    }
    try {
      return await this._createBulk(records);
    } finally {
      for (const record of records) {
        record._runCallbacks('create', 'after');
      }
      for (const record of records) {
        record._runCallbacks('save', 'after');
      }
    }
  }

  /**
   * Creates q query object
   */
  public static query<T extends BaseModel>(
    this: { new(data?: any): T } & typeof BaseModel,
  ): IQueryArray<T, T> {
    return new Query<T, T>(this);
  }

  /**
   * Finds a record by id
   * @throws {Error('not found')}
   */
  public static find<T extends BaseModel>(
    this: { new(data?: any): T } & typeof BaseModel,
    id: types.RecordID,
  ): IQuerySingle<T, T>;
  public static find<T extends BaseModel>(
    this: { new(data?: any): T } & typeof BaseModel,
    id: types.RecordID[],
  ): IQueryArray<T, T>;
  public static find<T extends BaseModel>(
    this: { new(data?: any): T } & typeof BaseModel,
    id: types.RecordID | types.RecordID[],
  ): IQuerySingle<T, T> | IQueryArray<T, T> {
    return this.query().find(id as types.RecordID);
  }

  /**
   * Finds records by ids while preserving order.
   * @throws {Error('not found')}
   */
  public static findPreserve<T extends BaseModel>(
    this: { new(data?: any): T } & typeof BaseModel,
    ids: types.RecordID[],
  ): IQueryArray<T, T> {
    return this.query().findPreserve(ids);
  }

  /**
   * Finds records by conditions
   */
  public static where<T extends BaseModel>(
    this: { new(data?: any): T } & typeof BaseModel,
    condition?: object,
  ): IQueryArray<T, T> {
    return this.query().where(condition);
  }

  /**
   * Selects columns for result
   */
  public static select<T extends BaseModel, K extends ModelColumnNamesWithId<T>>(
    this: { new(data?: any): T } & typeof BaseModel,
    columns: K[],
  ): IQueryArray<Pick<T, K>, T>;
  public static select<T extends BaseModel, K extends ModelColumnNamesWithId<T>>(
    this: { new(data?: any): T } & typeof BaseModel,
    columns?: string,
  ): IQueryArray<Pick<T, K>, T>;
  public static select<T extends BaseModel, K extends ModelColumnNamesWithId<T>>(
    this: { new(data?: any): T } & typeof BaseModel,
    columns?: string | K[],
  ): IQueryArray<Pick<T, K>, T> {
    return this.query().select<K>(columns as string);
  }

  /**
   * Specifies orders of result
   */
  public static order<T extends BaseModel>(
    this: { new(data?: any): T } & typeof BaseModel,
    orders: string,
  ): IQueryArray<T, T> {
    return this.query().order(orders);
  }

  /**
   * Groups result records
   */
  public static group<T extends BaseModel, G extends ModelColumnNamesWithId<T>, F>(
    this: { new(data?: any): T } & typeof BaseModel,
    group_by: G | G[],
    fields?: F,
  ): IQueryArray<{ [field in keyof F]: number } & Pick<T, G>, T>;
  public static group<T extends BaseModel, F>(
    this: { new(data?: any): T } & typeof BaseModel,
    group_by: null,
    fields?: F,
  ): IQueryArray<{ [field in keyof F]: number }, T>;
  public static group<T extends BaseModel, U>(
    this: { new(data?: any): T } & typeof BaseModel,
    group_by: string | null,
    fields?: object,
  ): IQueryArray<U, T>;
  public static group<T extends BaseModel, U>(
    this: { new(data?: any): T } & typeof BaseModel,
    group_by: string | null,
    fields?: object,
  ): IQueryArray<U, T> {
    return this.query().group<U>(group_by, fields);
  }

  /**
   * Counts records by conditions
   */
  public static async count(condition?: object): Promise<number> {
    return await this.query().where(condition).count();
  }

  /**
   * Updates some fields of records that match conditions
   */
  public static async update(updates: any, condition?: object): Promise<number> {
    return await this.query().where(condition).update(updates);
  }

  /**
   * Deletes records by conditions
   */
  public static async delete(condition?: object): Promise<number> {
    return await this.query().where(condition).delete();
  }

  /**
   * Adds 'created_at' and 'updated_at' fields to records
   */
  public static timestamps() {
    this.column('created_at', Date);
    this.column('updated_at', Date);
    this.beforeCreate(function(this: any) {
      const d = new Date();
      this.created_at = this.updated_at = d;
    });
    this.beforeUpdate(function(this: any) {
      const d = new Date();
      this.updated_at = d;
    });
  }

  /**
   * Adds a validator
   * A validator must return false(boolean) or error message(string), or throw an Error exception if invalid
   */
  public static addValidator(validator: any) {
    this._checkConnection();
    this._validators.push(validator);
  }

  public static _buildSaveDataColumn(
    data: any, model: any, column: string, property: IColumnPropertyInternal, allow_null: boolean = false,
  ) {
    const adapter = this._adapter;
    let value = util.getPropertyOfPath(model, property._parts);
    value = adapter.valueToDB(value, column, property);
    if (allow_null || value !== undefined) {
      if (adapter.support_nested) {
        util.setPropertyOfPath(data, property._parts_db, value);
      } else {
        data[property._dbname_us] = value;
      }
    }
  }

  public static _validateColumn(
    data: any, column: string, property: IColumnPropertyInternal, for_update: boolean = false,
  ) {
    let obj: any;
    let last: any;
    [obj, last] = util.getLeafOfPath(data, property._parts, false);
    const value = obj && obj[last];
    if (value != null) {
      if (property.array) {
        if (!Array.isArray(value)) {
          throw new Error(`'${column}' is not an array`);
        }
        try {
          for (let i = 0; i < value.length; i++) {
            value[i] = this._validateType(column, property.type_class, value[i]);
          }
        } catch (error) {
          // TODO: detail message like 'array of types'
          throw new Error(`'${column}' is not an array`);
        }
      } else {
        if (value.$inc != null) {
          if (for_update) {
            if (property.type_class === types.Number || property.type_class === types.Integer) {
              obj[last] = { $inc: this._validateType(column, property.type_class, value.$inc) };
            } else {
              throw new Error(`'${column}' is not a number type`);
            }
          } else {
            throw new Error('$inc is allowed only for update method');
          }
        } else {
          obj[last] = this._validateType(column, property.type_class, value);
        }
      }
    } else {
      if (property.required) {
        throw new Error(`'${column}' is required`);
      }
    }
  }

  private static _validators: any[];

  private static _callbacks_map: {
    [key in ModelCallbackName]?: Array<{
      type: ModelCallbackType,
      method: ModelCallbackMethod,
    }>;
  };

  /**
   * Adds a callback
   */
  private static addCallback(type: ModelCallbackType, name: ModelCallbackName, method: ModelCallbackMethod) {
    this._checkConnection();
    if (!(type === 'before' || type === 'after') || !name) {
      return;
    }
    const callbacks_map = this._callbacks_map || (this._callbacks_map = {});
    const callbacks = callbacks_map[name] || (callbacks_map[name] = []);
    return callbacks.push({ type, method });
  }

  private static async _createBulk(records: any[]) {
    let error;
    const data_array = records.map((record) => {
      try {
        return record._buildSaveData();
      } catch (e) {
        error = e;
      }
    });
    if (error) {
      throw error;
    }
    this._connection.log(this._name, 'createBulk', data_array);
    const ids = await this._adapter.createBulk(this._name, data_array);
    records.forEach((record, i) => {
      Object.defineProperty(record, 'id', {
        configurable: false,
        enumerable: true,
        value: ids[i],
        writable: false,
      });
    });
    return records;
  }

  private static _validateType(column: any, type_class: any, value: any) {
    switch (type_class) {
      case types.Number:
        value = Number(value);
        if (isNaN(value)) {
          throw new Error(`'${column}' is not a number`);
        }
        break;
      case types.Boolean:
        if (typeof value !== 'boolean') {
          throw new Error(`'${column}' is not a boolean`);
        }
        break;
      case types.Integer:
        value = Number(value);
        // value>>0 checkes integer and 32bit
        // tslint:disable-next-line:no-bitwise
        if (isNaN(value) || (value >> 0) !== value) {
          throw new Error(`'${column}' is not an integer`);
        }
        break;
      case types.GeoPoint:
        if (!(Array.isArray(value) && value.length === 2)) {
          throw new Error(`'${column}' is not a geo point`);
        } else {
          value[0] = Number(value[0]);
          value[1] = Number(value[1]);
        }
        break;
      case types.Date:
        value = new Date(value);
        if (isNaN(value.getTime())) {
          throw new Error(`'${column}' is not a date`);
        }
    }
    return value;
  }

  public readonly id?: any;

  private _intermediates?: any;
  private _prev_attributes?: any;
  private _attributes?: any;
  private _is_persisted?: any;

  /**
   * Creates a record
   */
  public constructor(data?: object) {
    data = data || {};
    const ctor = this.constructor as typeof BaseModel;
    const schema = ctor._schema;
    const adapter = ctor._adapter;
    Object.defineProperty(this, '_prev_attributes', { writable: true, value: {} });
    if (ctor.dirty_tracking) {
      Object.defineProperty(this, '_attributes', { value: {} });
      Object.defineProperty(this, '_intermediates', { value: {} });
      for (const path of Object.keys(ctor._intermediate_paths).sort()) {
        const [obj, last] = util.getLeafOfPath(this, path);
        this._intermediates[path] = {};
        this._defineProperty(obj, last, path, false);
      }
      // tslint:disable-next-line:forin
      for (const column in schema) {
        const property = schema[column];
        if (property.primary_key) {
          continue;
        }
        const [obj, last] = util.getLeafOfPath(this, property._parts);
        this._defineProperty(obj, last, column, false);
      }
    } else {
      Object.defineProperty(this, 'isDirty', { value: _pf_isDirty });
      Object.defineProperty(this, 'getChanged', { value: _pf_getChanged });
      Object.defineProperty(this, 'get', { value: _pf_get });
      Object.defineProperty(this, 'getPrevious', { value: _pf_getPrevious });
      Object.defineProperty(this, 'set', { value: _pf_set });
      Object.defineProperty(this, 'reset', { value: _pf_reset });
    }
    if (arguments.length === 4) {
      // if this has 4 arguments, this is called from adapter with database record data
      const id = arguments[1];
      const selected_columns = arguments[2];
      const selected_columns_raw = arguments[3];
      adapter.setValuesFromDB(this, data, schema, selected_columns);
      ctor._collapseNestedNulls(this, selected_columns_raw, ctor.dirty_tracking ? this._intermediates : undefined);
      Object.defineProperty(this, 'id', {
        configurable: false,
        enumerable: true,
        value: id,
        writable: false,
      });
      Object.defineProperty(this, '_is_persisted', {
        configurable: false,
        enumerable: false,
        value: true,
        writable: false,
      });
      this._runCallbacks('find', 'after');
    } else {
      // tslint:disable-next-line:forin
      for (const column in schema) {
        const property = schema[column];
        if (property.primary_key) {
          continue;
        }
        const parts = property._parts;
        let value = util.getPropertyOfPath(data, parts);
        if (value === undefined) {
          value = null;
        }
        util.setPropertyOfPath(this, parts, value);
      }
      ctor._collapseNestedNulls(this, null, ctor.dirty_tracking ? this._intermediates : undefined);
      Object.defineProperty(this, 'id', {
        configurable: true,
        enumerable: true,
        value: null,
        writable: false,
      });
    }
    this._runCallbacks('initialize', 'after');
  }

  /**
   * Returns true if there is some changed columns
   */
  public isDirty() {
    return Object.keys(this._prev_attributes).length > 0;
  }

  /**
   * Returns the list of paths of changed columns
   */
  public getChanged() {
    return Object.keys(this._prev_attributes);
  }

  /**
   * Returns the current value of the column of the given path
   */
  public get(path: any) {
    if (this._intermediates.hasOwnProperty(path)) {
      return this._intermediates[path];
    } else {
      return util.getPropertyOfPath(this._attributes, path);
    }
  }

  /**
   * Returns the original value of the column of the given path
   */
  public getPrevious(path: any) {
    return this._prev_attributes[path];
  }

  /**
   * Changes the value of the column of the given path
   */
  public set(path: any, value: any) {
    if (this._intermediates.hasOwnProperty(path)) {
      const obj = this._intermediates[path];
      // tslint:disable-next-line:forin
      for (const k in obj) {
        obj[k] = undefined;
      }
      // tslint:disable-next-line:forin
      for (const k in value) {
        obj[k] = value[k];
      }
    } else {
      const parts = path.split('.');
      const prev_value = util.getPropertyOfPath(this._attributes, parts);
      if (prev_value === value) {
        return;
      }
      if (!this._prev_attributes.hasOwnProperty(path)) {
        this._prev_attributes[path] = prev_value;
      }
      let [obj, last] = util.getLeafOfPath(this, parts);
      this._defineProperty(obj, last, path, true);
      util.setPropertyOfPath(this._attributes, parts, value);
      while (parts.length > 1) {
        parts.pop();
        [obj, last] = util.getLeafOfPath(this, parts);
        this._defineProperty(obj, last, parts.join('.'), true);
      }
    }
  }

  /**
   * Resets all changes
   */
  public reset() {
    // tslint:disable-next-line:forin
    for (const path in this._prev_attributes) {
      const value = this._prev_attributes[path];
      this.set(path, value);
    }
    this._prev_attributes = {};
  }

  /**
   * Destroys this record (remove from the database)
   */
  public async destroy() {
    this._runCallbacks('destroy', 'before');
    try {
      if (this.id) {
        const ctor = this.constructor as typeof BaseModel;
        await ctor.delete({ id: this.id });
      }
    } finally {
      this._runCallbacks('destroy', 'after');
    }
  }

  public _defineProperty(object: any, key: any, path: any, enumerable: any) {
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable,
      get: () => {
        return this.get(path);
      },
      set: (value) => {
        return this.set(path, value);
      },
    });
  }

  /**
   * Saves data to the database
   */
  public async save(
    options: { skip_log?: boolean, validate?: boolean } = {},
  ): Promise<this> {
    const ctor = this.constructor as typeof BaseModel;
    await ctor._checkReady();
    if (!this._is_persisted) {
      // apply default values
      const schema = ctor._schema;
      // tslint:disable-next-line:forin
      for (const column in schema) {
        const property = schema[column];
        if (property.primary_key) {
          continue;
        }
        const value = util.getPropertyOfPath(this, property._parts);
        if (value == null && property.default_value !== undefined) {
          if (_.isFunction(property.default_value)) {
            util.setPropertyOfPath(this, property._parts, property.default_value());
          } else {
            util.setPropertyOfPath(this, property._parts, property.default_value);
          }
        }
      }
    }
    if (options.validate !== false) {
      await this.validate();
      return await this.save({ ...options, validate: false });
    }
    this._runCallbacks('save', 'before');
    if (this._is_persisted) {
      this._runCallbacks('update', 'before');
      try {
        await this._update(options);
      } finally {
        this._runCallbacks('update', 'after');
        this._runCallbacks('save', 'after');
      }
    } else {
      this._runCallbacks('create', 'before');
      try {
        await this._create(options);
      } finally {
        this._runCallbacks('create', 'after');
        this._runCallbacks('save', 'after');
      }
    }
    return this;
  }

  /**
   * Validates data
   */
  public validate() {
    this._runCallbacks('validate', 'before');
    const errors: any[] = [];
    const ctor = this.constructor as typeof BaseModel;
    const schema = ctor._schema;
    // tslint:disable-next-line:forin
    for (const column in schema) {
      const property = schema[column];
      if (property.primary_key) {
        continue;
      }
      try {
        ctor._validateColumn(this, column, property);
      } catch (error) {
        errors.push(error.message);
      }
    }
    ctor._validators.forEach((validator: any) => {
      try {
        const r = validator(this);
        if (r === false) {
          errors.push('validation failed');
        } else if (typeof r === 'string') {
          errors.push(r);
        }
      } catch (e) {
        errors.push(e.message);
      }
    });
    if (errors.length > 0) {
      this._runCallbacks('validate', 'after');
      throw new Error(errors.join(','));
    } else {
      this._runCallbacks('validate', 'after');
    }
  }

  private _runCallbacks(name: ModelCallbackName, type: ModelCallbackType) {
    const ctor = this.constructor as typeof BaseModel;
    let callbacks = ctor._callbacks_map && ctor._callbacks_map[name];
    if (!callbacks) {
      return;
    }
    callbacks = callbacks.filter((callback: any) => callback.type === type);
    for (const callback of callbacks) {
      let method = callback.method;
      if (typeof method === 'string') {
        if (!(this as any)[method]) {
          throw new Error(`The method '${method}' doesn't exist`);
        }
        method = (this as any)[method];
      }
      if (typeof method !== 'function') {
        throw new Error('Cannot execute method');
      }
      method.call(this);
    }
  }

  private _buildSaveData() {
    const data: any = {};
    const ctor = this.constructor as typeof BaseModel;
    const schema = ctor._schema;
    // tslint:disable-next-line:forin
    for (const column in schema) {
      const property = schema[column];
      if (property.primary_key) {
        continue;
      }
      ctor._buildSaveDataColumn(data, this, column, property);
    }
    if (this.id != null) {
      data.id = ctor._adapter.idToDB(this.id);
    }
    return data;
  }

  private async _create(options: any) {
    const data = this._buildSaveData();
    const ctor = this.constructor as typeof BaseModel;
    if (!(options && options.skip_log)) {
      ctor._connection.log(ctor._name, 'create', data);
    }
    const id = await ctor._adapter.create(ctor._name, data);
    Object.defineProperty(this, 'id', {
      configurable: false,
      enumerable: true,
      value: id,
      writable: false,
    });
    Object.defineProperty(this, '_is_persisted', {
      configurable: false,
      enumerable: false,
      value: true,
      writable: false,
    });
    // save sub objects of each association
    const foreign_key = inflector.foreign_key(ctor._name);
    const promises = Object.keys(ctor._associations).map(async (column) => {
      const sub_promises = ((this as any)['__cache_' + column] || []).map((sub: any) => {
        sub[foreign_key] = id;
        return sub.save();
      });
      return (await Promise.all(sub_promises));
    });
    try {
      await Promise.all(promises);
    } catch (error) {
      //
    }
    return this._prev_attributes = {};
  }

  private async _update(options: any) {
    const ctor = this.constructor as typeof BaseModel;
    if (ctor.dirty_tracking) {
      // update changed values only
      if (!this.isDirty()) {
        return;
      }
      const data = {};
      const adapter = ctor._adapter;
      const schema = ctor._schema;
      // tslint:disable-next-line:forin
      for (const path in this._prev_attributes) {
        ctor._buildSaveDataColumn(data, this._attributes, path, schema[path], true);
      }
      if (!(options && options.skip_log)) {
        ctor._connection.log(ctor._name, 'update', data);
      }
      await adapter.updatePartial(ctor._name, data, [{ id: this.id }], {});
      return this._prev_attributes = {};
    } else {
      // update all
      const data = this._buildSaveData();
      if (!(options && options.skip_log)) {
        ctor._connection.log(ctor._name, 'update', data);
      }
      await ctor._adapter.update(ctor._name, data);
      return this._prev_attributes = {};
    }
  }
}

export { BaseModel };
