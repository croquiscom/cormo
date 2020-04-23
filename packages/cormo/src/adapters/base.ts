import stream from 'stream';
import _ from 'lodash';
import { Connection } from '../connection';
import { ColumnPropertyInternal, IndexProperty } from '../model';
import { IsolationLevel, Transaction } from '../transaction';
import * as types from '../types';
import * as util from '../util';

export interface SchemasColumn {
  required: boolean;
  type: types.ColumnType | undefined;
  adapter_type_string?: string;
}

export interface SchemasTable {
  [column_name: string]: SchemasColumn;
}

export interface SchemasIndex {
  [index_name: string]: any;
}

export interface Schemas {
  tables: { [table_name: string]: SchemasTable | 'NO SCHEMA' };
  indexes?: { [table_name: string]: SchemasIndex };
  foreign_keys?: { [table_name: string]: any };
}

export interface AdapterFindOptions {
  lean: boolean;
  orders: any[];
  near?: any;
  select?: string[];
  select_raw?: string[];
  conditions_of_group: any[];
  group_fields?: any;
  group_by?: string[];
  limit?: number;
  skip?: number;
  explain?: boolean;
  transaction?: Transaction;
  node?: 'master' | 'read';
  index_hint?: string;
}

export interface AdapterCountOptions {
  conditions_of_group: any[];
  group_fields?: any;
  group_by?: string[];
  transaction?: Transaction;
  node?: 'master' | 'read';
  index_hint?: string;
}

/**
 * Base class for adapters
 * @namespace adapter
 */
abstract class AdapterBase {
  /**
   * Wraps adapter specific errors
   * @param msg CORMO's error message
   * @param cause adapter specific error object
   * @internal
   */
  public static wrapError(msg: string, cause?: Error): Error {
    if (msg === 'unknown error' && cause && cause.message === 'transaction finished') {
      return cause;
    }
    const error = new Error(msg);
    (error as any).cause = cause;
    return error;
  }

  /** @internal */
  public _connection!: Connection;

  /** @internal */
  public support_fractional_seconds = true;

  /** @internal */
  public support_upsert = true;

  /** @internal */
  public support_nested = false;

  /** @internal */
  public support_geopoint = false;

  /** @internal */
  public support_string_type_with_length = false;

  /** @internal */
  public key_type: any;
  /** @internal */
  public key_type_internal: any;

  /** @internal */
  public native_integrity = false;

  /** @internal */
  public async connect(settings: {}) {
    return Promise.resolve();
  }

  /**
   * Returns current schemas.
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public async getSchemas(): Promise<Schemas> {
    return Promise.resolve({ tables: {} });
  }

  /**
   * Creates a table.
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public async createTable(model: string) {
    return Promise.resolve();
  }

  /** Adds a column to a table
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public async addColumn(model: string, column_property: ColumnPropertyInternal) {
    return Promise.resolve();
  }

  /** Creates an index.
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public async createIndex(model_name: string, index: IndexProperty) {
    return Promise.resolve();
  }

  /** Creates a foreign key.
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public async createForeignKey(model: string, column: string, type: string, references: {}) {
    return Promise.resolve();
  }

  /**
   * Drops a model from the database
   * @abstract
   * @see BaseModel.drop
   * @internal
   */
  public async drop(model: string): Promise<void> {
    return Promise.reject(new Error('not implemented'));
  }

  /** @internal */
  public idToDB(value: any) {
    return value;
  }

  /** @internal */
  public valueToDB(value: any, column: any, property: any) {
    if (property.type_class === types.Object || property.array) {
      return JSON.stringify(value);
    } else if (value != null) {
      return value;
    } else {
      return null;
    }
  }

  /** @internal */
  public setValuesFromDB(instance: any, data: any, schema: any, selected_columns: any) {
    if (!selected_columns) {
      selected_columns = Object.keys(schema);
    }
    const support_nested = this.support_nested;
    for (const column of selected_columns) {
      const property = schema[column];
      let value = support_nested ? util.getPropertyOfPath(data, property._parts_db) : data[property._dbname_us];
      if (value != null) {
        value = this.valueToModel(value, property);
      } else {
        value = null;
      }
      util.setPropertyOfPath(instance, property._parts, value);
    }
  }

  public getAdapterTypeString(column_property: ColumnPropertyInternal): string | undefined {
    return;
  }

  /**
   * Creates a record
   * @internal
   */
  public abstract async create(model: string, data: any, options: { transaction?: Transaction }): Promise<any>;

  /**
   * Creates records
   * @internal
   */
  public abstract async createBulk(
    model: string, data: any[],
    options: { transaction?: Transaction },
  ): Promise<any[]>;

  /**
   * Updates a record
   * @internal
   */
  public abstract async update(model: string, data: any, options: { transaction?: Transaction }): Promise<void>;

  /**
   * Updates some fields of records that match conditions
   * @internal
   */
  public abstract async updatePartial(
    model: string, data: any, conditions: any,
    options: { transaction?: Transaction },
  ): Promise<number>;

  /**
   * Updates some fields of records that match conditions or inserts a new record
   * @internal
   */
  public abstract async upsert(model: string, data: any, conditions: any, options: any): Promise<void>;

  /**
   * Finds a record by id
   * @see Query::exec
   * @internal
   */
  public abstract async findById(
    model: string, id: any,
    options: { select?: string[]; explain?: boolean; transaction?: Transaction; node?: 'master' | 'read' },
  ): Promise<any>;

  /**
   * Finds records
   * @see Query::exec
   * @internal
   */
  public abstract async find(model: string, conditions: any, options: AdapterFindOptions): Promise<any>;

  /**
   * Streams matching records
   * @see Query::stream
   * @internal
   */
  public abstract stream(model: any, conditions: any, options: AdapterFindOptions): stream.Readable;

  /**
   * Counts records
   * @see Query::count
   * @internal
   */
  public abstract async count(model: string, conditions: any, options: AdapterCountOptions): Promise<number>;

  /**
   * Deletes records from the database
   * @see Query::delete
   * @internal
   */
  public abstract async delete(model: string, conditions: any, options: { transaction?: Transaction }): Promise<number>;

  /**
   * Closes connection
   * @internal
   */
  public abstract close(): void;

  /** @internal */
  public async getConnection(): Promise<any> {
    //
  }

  /** @internal */
  public async releaseConnection(adapter_connection: any): Promise<void> {
    //
  }

  /** @internal */
  public async startTransaction(adapter_connection: any, isolation_level?: IsolationLevel): Promise<void> {
    //
  }

  /** @internal */
  public async commitTransaction(adapter_connection: any): Promise<void> {
    //
  }

  /** @internal */
  public async rollbackTransaction(adapter_connection: any): Promise<void> {
    //
  }

  /** @internal */
  protected _getModelID(data: any) {
    return data.id;
  }

  /** @internal */
  protected valueToModel(value: any, property: any) {
    if (property.type_class === types.Object || property.array) {
      return JSON.parse(value);
    } else {
      return value;
    }
  }

  /** @internal */
  protected _convertToModelInstance(model: any, data: any, options: any) {
    if (options.lean) {
      model = this._connection.models[model];
      const instance: any = {};
      this.setValuesFromDB(instance, data, model._schema, options.select);
      model._collapseNestedNulls(instance, options.select_raw, null);
      const id = this._getModelID(data);
      if (id) {
        instance.id = id;
      }
      return instance;
    } else {
      const id = this._getModelID(data);
      const modelClass: any = this._connection.models[model];
      return new modelClass(data, id, options.select, options.select_raw);
    }
  }

  /** @internal */
  protected _convertToGroupInstance(model_name: string, data: any, group_by: any, group_fields: any) {
    const instance: any = {};
    if (group_by) {
      const schema = this._connection.models[model_name]._schema;
      for (const field of group_by) {
        const property = _.find(schema, (item) => item._dbname_us === field);
        if (property) {
          util.setPropertyOfPath(instance, property._parts, this.valueToModel(data[field], property));
        }
      }
    }
    for (const field in group_fields) {
      const expr = group_fields[field];
      const op = Object.keys(expr)[0];
      if (op === '$sum' || op === '$max' || op === '$min' || op === '$avg') {
        instance[field] = Number(data[field]);
      } else if (op === '$any') {
        instance[field] = data[field];
      }
    }
    return instance;
  }

  /** @internal */
  protected async _createBulkDefault(model: string, data: any[], options: { transaction?: Transaction }) {
    return await Promise.all(data.map((item: any) => {
      return this.create(model, item, options);
    }));
  }
}

export { AdapterBase };

if (process.env.NODE_ENV === 'test') {
  (AdapterBase as any).wrapError = (msg: string, cause: Error): Error => {
    if (msg === 'unknown error' && cause && cause.message === 'transaction finished') {
      return cause;
    }
    return new Error(msg + ' caused by ' + cause.toString());
  };
}
