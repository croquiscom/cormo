import * as stream from 'stream';
import { Connection } from '../connection';
import * as types from '../types';
import * as util from '../util';

export interface ISchemas {
  tables: { [table_name: string]: any };
  indexes?: { [table_name: string]: any };
  foreign_keys?: { [table_name: string]: any };
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
   */
  public static wrapError(msg: string, cause?: Error): Error {
    const error = new Error(msg);
    (error as any).cause = cause;
    return error;
  }

  public _connection!: Connection;

  public support_fractional_seconds = true;

  public support_upsert = true;

  public support_nested = false;

  public support_geopoint = false;

  public support_string_type_with_length = false;

  public key_type: any;
  public key_type_internal: any;

  public native_integrity = false;

  public async connect(settings: {}) {
    return;
  }

  /**
   * Returns current schemas.
   * @abstract
   * @see Connection::applySchemas
   */
  public async getSchemas(): Promise<ISchemas> {
    return { tables: {} };
  }

  /**
   * Creates a table.
   * @abstract
   * @see Connection::applySchemas
   */
  public async createTable(model: string) {
    return;
  }

  /** Adds a column to a table
   * @abstract
   * @see Connection::applySchemas
   */
  public async addColumn(model: string, column_property: object) {
    return;
  }

  /** Creates an index.
   * @abstract
   * @see Connection::applySchemas
   */
  public async createIndex(model: string, index: {}) {
    return;
  }

  /** Creates a foreign key.
   * @abstract
   * @see Connection::applySchemas
   */
  public async createForeignKey(model: string, column: string, type: string, references: {}) {
    return;
  }

  /**
   * Drops a model from the database
   * @abstract
   * @see BaseModel.drop
   */
  public async drop(model: string) {
    throw new Error('not implemented');
  }

  public idToDB(value: any) {
    return value;
  }

  public valueToDB(value: any, column: any, property: any) {
    if (property.type_class === types.Object || property.array) {
      return JSON.stringify(value);
    } else if (value != null) {
      return value;
    } else {
      return null;
    }
  }

  public setValuesFromDB(instance: any, data: any, schema: any, selected_columns: any) {
    if (!selected_columns) {
      selected_columns = Object.keys(schema);
    }
    const support_nested = this.support_nested;
    for (const column of selected_columns) {
      const property = schema[column];
      const parts = property._parts;
      let value = support_nested ? util.getPropertyOfPath(data, parts) : data[property._dbname];
      if (value != null) {
        value = this.valueToModel(value, property);
      } else {
        value = null;
      }
      util.setPropertyOfPath(instance, parts, value);
    }
  }

  /**
   * Creates a record
   */
  public abstract async create(model: string, data: object): Promise<any>;

  /**
   * Creates records
   */
  public abstract async createBulk(model: string, data: object[]): Promise<any[]>;

  /**
   * Updates a record
   */
  public abstract async update(model: string, data: any): Promise<void>;

  /**
   * Updates some fields of records that match conditions
   */
  public abstract async updatePartial(model: string, data: any, conditions: any, options: any): Promise<number>;

  /**
   * Updates some fields of records that match conditions or inserts a new record
   */
  public abstract async upsert(model: string, data: any, conditions: any, options: any): Promise<void>;

  /**
   * Finds a record by id
   * @see Query::exec
   */
  public abstract async findById(model: any, id: any, options: any): Promise<any>;

  /**
   * Finds records
   * @see Query::exec
   */
  public abstract async find(model: any, conditions: any, options: any): Promise<any>;

  /**
   * Streams matching records
   * @see Query::stream
   */
  public abstract stream(model: any, conditions: any, options: any): stream.Readable;

  /**
   * Counts records
   * @see Query::count
   */
  public abstract async count(model: any, conditions: any, options: any): Promise<number>;

  /**
   * Deletes records from the database
   * @see Query::delete
   */
  public abstract async delete(model: any, conditions: any): Promise<number>;

  /**
   * Closes connection
   */
  public abstract close(): void;

  protected _getModelID(data: any) {
    return data.id;
  }

  protected valueToModel(value: any, property: any) {
    if (property.type_class === types.Object || property.array) {
      return JSON.parse(value);
    } else {
      return value;
    }
  }

  protected _convertToModelInstance(model: any, data: any, options: any) {
    if (options.lean) {
      model = this._connection.models[model];
      const instance: any = {};
      this.setValuesFromDB(instance, data, model._schema, options.select);
      model._collapseNestedNulls(instance, options.select_raw, null);
      instance.id = this._getModelID(data);
      return instance;
    } else {
      const id = this._getModelID(data);
      const modelClass: any = this._connection.models[model];
      return new modelClass(data, id, options.select, options.select_raw);
    }
  }

  protected _convertToGroupInstance(model: any, data: any, group_by: any, group_fields: any) {
    const instance: any = {};
    if (group_by) {
      const schema = this._connection.models[model]._schema;
      for (const field of group_by) {
        const property = schema[field];
        if (property) {
          instance[field] = this.valueToModel(data[field], property);
        }
      }
    }
    // tslint:disable-next-line:forin
    for (const field in group_fields) {
      const expr = group_fields[field];
      const op = Object.keys(expr)[0];
      if (op === '$sum' || op === '$max' || op === '$min') {
        instance[field] = Number(data[field]);
      }
    }
    return instance;
  }

  protected async _createBulkDefault(model: any, data: any) {
    return await Promise.all(data.map((item: any) => {
      return this.create(model, item);
    }));
  }
}

export { AdapterBase };

if (process.env.NODE_ENV === 'test') {
  (AdapterBase as any).wrapError = (msg: string, cause: Error): Error => {
    return new Error(msg + ' caused by ' + cause.toString());
  };
}
