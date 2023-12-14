/* eslint-disable @typescript-eslint/no-unused-vars */

import stream from 'stream';
import _ from 'lodash';
import { Connection } from '../connection';
import { ColumnPropertyInternal, IndexProperty, ModelSchemaInternal } from '../model';
import { IsolationLevel, Transaction } from '../transaction';
import * as types from '../types';
import * as util from '../util';

export interface SchemasColumn {
  required: boolean;
  type: types.ColumnType | undefined;
  adapter_type_string?: string;
  description?: string;
}

export interface SchemasTable {
  columns: { [column_name: string]: SchemasColumn | undefined };
  description?: string;
}

export interface SchemasIndex {
  [index_name: string]: any;
}

export interface Schemas {
  tables: { [table_name: string]: SchemasTable | 'NO SCHEMA' | undefined };
  indexes?: { [table_name: string]: SchemasIndex | undefined };
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
  joins: Array<{ model_name: string; type: string; alias: string; base_column: string; join_column: string }>;
  distinct?: boolean;
  limit?: number;
  skip?: number;
  explain?: boolean;
  transaction?: Transaction;
  node?: 'master' | 'read';
  index_hint?: string;
}

export interface AdapterCountOptions {
  select?: string[];
  conditions_of_group: any[];
  group_fields?: any;
  group_by?: string[];
  joins: Array<{ model_name: string; type: string; alias: string; base_column: string; join_column: string }>;
  distinct?: boolean;
  transaction?: Transaction;
  node?: 'master' | 'read';
  index_hint?: string;
}

export interface AdapterUpsertOptions {
  transaction?: Transaction;
  node?: 'master' | 'read';
  ignore_on_update?: string[];
}

export interface AdapterDeleteOptions {
  orders: any[];
  limit?: number;
  skip?: number;
  transaction?: Transaction;
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
  public support_join = false;

  /** @internal */
  public support_distinct = false;

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

  /** Get query for creating a table
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public getCreateTableQuery(model_name: string): string | null {
    return null;
  }

  /**
   * Creates a table.
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public async createTable(model_name: string, verbose = false) {
    return Promise.resolve();
  }

  /** Get query for updating a table description
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public getUpdateTableDescriptionQuery(model_name: string): string | null {
    return null;
  }

  /**
   * Update a table description.
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public async updateTableDescription(model_name: string, verbose = false) {
    return Promise.resolve();
  }

  /** Get query for adding a column
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public getAddColumnQuery(model_name: string, column_property: ColumnPropertyInternal): string | null {
    return null;
  }

  /** Adds a column to a table
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public async addColumn(model_name: string, column_property: ColumnPropertyInternal, verbose = false) {
    return Promise.resolve();
  }

  /** Get query for updating a column description
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public getUpdateColumnDescriptionQuery(model_name: string, column_property: ColumnPropertyInternal): string | null {
    return null;
  }

  /**
   * Update a column description.
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public async updateColumnDescription(model_name: string, column_property: ColumnPropertyInternal, verbose = false) {
    return Promise.resolve();
  }

  /** Get query for creating an index
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public getCreateIndexQuery(model_name: string, index: IndexProperty): string | null {
    return null;
  }

  /** Creates an index.
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public async createIndex(model_name: string, index: IndexProperty, verbose = false) {
    return Promise.resolve();
  }

  /** Get query for creating a foreign key
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public getCreateForeignKeyQuery(model_name: string, column: string, type: string, references: {}): string | null {
    return null;
  }

  /** Creates a foreign key.
   * @abstract
   * @see Connection::applySchemas
   * @internal
   */
  public async createForeignKey(model_name: string, column: string, type: string, references: {}, verbose = false) {
    return Promise.resolve();
  }

  /**
   * Deletes all records with ignoring constraint
   * @abstract
   * @see BaseModel.drop
   * @internal
   */
  public async deleteAllIgnoringConstraint(model_list: string[]): Promise<void> {
    return Promise.reject(new Error('not implemented'));
  }

  /**
   * Drops a model from the database
   * @abstract
   * @see BaseModel.drop
   * @internal
   */
  public async drop(model_name: string): Promise<void> {
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
  public setValuesFromDB(
    instance: any,
    data: any,
    schema: ModelSchemaInternal,
    selected_columns: any,
    query_record_id_as_string: boolean,
  ) {
    if (!selected_columns) {
      selected_columns = Object.keys(schema);
    }
    const support_nested = this.support_nested;
    for (const column of selected_columns) {
      const property = schema[column];
      if (!property) {
        continue;
      }
      let value = support_nested ? util.getPropertyOfPath(data, property._parts_db) : data[property._dbname_us];
      if (value != null) {
        value = this.valueToModel(value, property, query_record_id_as_string);
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
  public abstract create(
    model_name: string,
    data: any,
    options: { transaction?: Transaction; use_id_in_data?: boolean },
  ): Promise<any>;

  /**
   * Creates records
   * @internal
   */
  public abstract createBulk(
    model_name: string,
    data: any[],
    options: { transaction?: Transaction; use_id_in_data?: boolean },
  ): Promise<any[]>;

  /**
   * Updates a record
   * @internal
   */
  public abstract update(model_name: string, data: any, options: { transaction?: Transaction }): Promise<void>;

  /**
   * Updates some fields of records that match conditions
   * @internal
   */
  public abstract updatePartial(
    model_name: string,
    data: any,
    conditions: Array<Record<string, any>>,
    options: { transaction?: Transaction },
  ): Promise<number>;

  /**
   * Updates some fields of records that match conditions or inserts a new record
   * @internal
   */
  public abstract upsert(
    model_name: string,
    data: any,
    conditions: Array<Record<string, any>>,
    options: AdapterUpsertOptions,
  ): Promise<void>;

  /**
   * Finds a record by id
   * @see Query::exec
   * @internal
   */
  public abstract findById(
    model_name: string,
    id: any,
    options: { select?: string[]; explain?: boolean; transaction?: Transaction; node?: 'master' | 'read' },
  ): Promise<any>;

  /**
   * Finds records
   * @see Query::exec
   * @internal
   */
  public abstract find(
    model_name: string,
    conditions: Array<Record<string, any>>,
    options: AdapterFindOptions,
  ): Promise<any>;

  /**
   * Streams matching records
   * @see Query::stream
   * @internal
   */
  public abstract stream(
    model_name: string,
    conditions: Array<Record<string, any>>,
    options: AdapterFindOptions,
  ): stream.Readable;

  /**
   * Counts records
   * @see Query::count
   * @internal
   */
  public abstract count(
    model_name: string,
    conditions: Array<Record<string, any>>,
    options: AdapterCountOptions,
  ): Promise<number>;

  /**
   * Deletes records from the database
   * @see Query::delete
   * @internal
   */
  public abstract delete(
    model_name: string,
    conditions: Array<Record<string, any>>,
    options: AdapterDeleteOptions,
  ): Promise<number>;

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
  protected valueToModel(value: any, property: ColumnPropertyInternal, _query_record_id_as_string: boolean) {
    if (property.type_class === types.Object || property.array) {
      return JSON.parse(value);
    } else {
      return value;
    }
  }

  /** @internal */
  protected _convertToModelInstance(model_name: string, data: any, options: any) {
    if (options.lean) {
      const model_class = this._connection.models[model_name];
      if (!model_class) {
        return null;
      }
      const instance: any = {};
      this.setValuesFromDB(instance, data, model_class._schema, options.select, model_class.query_record_id_as_string);
      model_class._collapseNestedNulls(instance, options.select_raw, null);
      const raw_id = this._getModelID(data);
      const id = raw_id && model_class.query_record_id_as_string ? String(raw_id) : raw_id;
      if (id) {
        instance.id = id;
      }
      return instance;
    } else {
      const model_class: any = this._connection.models[model_name];
      const raw_id = this._getModelID(data);
      const id = raw_id && model_class.query_record_id_as_string ? String(raw_id) : raw_id;
      return new model_class(data, id, options.select, options.select_raw);
    }
  }

  /** @internal */
  protected _convertToGroupInstance(
    model_name: string,
    data: any,
    group_by: any,
    group_fields: any,
    query_record_id_as_string: boolean,
  ) {
    const instance: any = {};
    if (group_by) {
      const model_class = this._connection.models[model_name];
      if (!model_class) {
        return;
      }
      const schema = model_class._schema;
      for (const field of group_by) {
        const property = _.find(schema, (item) => item?._dbname_us === field);
        if (property) {
          util.setPropertyOfPath(
            instance,
            property._parts,
            this.valueToModel(data[field], property, query_record_id_as_string),
          );
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
  protected async _createBulkDefault(
    model_name: string,
    data: any[],
    options: { transaction?: Transaction; use_id_in_data?: boolean },
  ) {
    return await Promise.all(
      data.map((item: any) => {
        return this.create(model_name, item, options);
      }),
    );
  }
}

export { AdapterBase };

if (process.env.NODE_ENV === 'test') {
  (AdapterBase as any).wrapError = (msg: string, cause: Error): Error => {
    if (msg === 'unknown error' && cause.message === 'transaction finished') {
      return cause;
    }
    return new Error(msg + ' caused by ' + cause.toString());
  };
}
