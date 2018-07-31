import * as stream from 'stream';
import * as types from '../types';
import * as util from '../util';

/**
 * Base class for adapters
 * @namespace adapter
 */
class AdapterBase {
  /**
   * Wraps adapter specific errors
   * @param msg CORMO's error message
   * @param cause adapter specific error object
   */
  protected static wrapError(msg: string, cause: Error): Error {
    const error = new Error(msg);
    (error as any).cause = cause;
    return error;
  }

  public support_fractional_seconds = true;

  public support_upsert = true;

  public async connect(settings: {}) {
    return;
  }

  /**
   * Returns current schemas.
   * @abstract
   * @see Connection::applySchemas
   */
  public async getSchemas(): Promise<{ tables: any[] }> {
    return { tables: [] };
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
   * @see Model.drop
   */
  public async drop(model: string) {
    throw new Error('not implemented');
  }

  public idToDB(value) {
    return value;
  }

  public valueToDB(value, column, property) {
    if (property.type_class === types.Object || property.array) {
      return JSON.stringify(value);
    } else if (value != null) {
      return value;
    } else {
      return null;
    }
  }

  public setValuesFromDB(instance, data, schema, selected_columns) {
    var column, i, len, parts, property, results, support_nested, value;
    if (!selected_columns) {
      selected_columns = Object.keys(schema);
    }
    support_nested = this.support_nested;
    results = [];
    for (i = 0, len = selected_columns.length; i < len; i++) {
      column = selected_columns[i];
      property = schema[column];
      parts = property._parts;
      value = support_nested ? util.getPropertyOfPath(data, parts) : data[property._dbname];
      if (value != null) {
        value = this.valueToModel(value, property);
      } else {
        value = null;
      }
      results.push(util.setPropertyOfPath(instance, parts, value));
    }
    return results;
  }

  /**
   * Creates a record
   * @abstract
   * @promise
   */
  public async create(model: string, data: object): Promise<any> {
    throw new Error('not implemented');
  }

  /**
   * Creates records
   * @abstract
   * @param {String} model
   * @param {Array<Object>} data
   * @return {Array<RecordID>}
   * @promise
   */
  public async createBulk(model: string, data: object[]): Promise<any[]> {
    throw new Error('not implemented');
  }

  /**
   * Updates a record
   * @abstract
   */
  public async update(model: string, data: any) {
    throw new Error('not implemented');
  }

  /**
   * Updates some fields of records that match conditions
   * @abstract
   */
  public async updatePartial(model: string, data: any, conditions: any, options: any) {
    throw new Error('not implemented');
  }

  /**
   * Updates some fields of records that match conditions or inserts a new record
   * @abstract
   */
  public async upsert(model: string, data: any, conditions: any, options: any) {
    throw new Error('not implemented');
  }

  /**
   * Finds a record by id
   * @abstract
   * @param {String} model
   * @param {RecordID} id
   * @param {Object} options
   * @return {Model}
   * @promise
   * @throws {Error('not found')}
   * @see Query::exec
   */
  public async findById(model, id, options) {
    return Promise.reject(new Error('not implemented'));
  }

  /**
   * Finds records
   * @abstract
   * @param {String} model
   * @param {Object} conditions
   * @param {Object} options
   * @return {Array<Model>}
   * @promise
   * @see Query::exec
   */
  public async find(model, conditions, options) {
    return Promise.reject(new Error('not implemented'));
  }

  /**
   * Streams matching records
   * @abstract
   * @param {String} model
   * @param {Object} conditions
   * @param {Object} options
   * @return {Readable}
   * @see Query::stream
   */
  public stream(model, conditions, options) {
    var readable;
    readable = new stream.Readable({
      objectMode: true
    });
    readable._read = function() {
      return readable.emit('error', new Error('not implemented'));
    };
    return readable;
  }

  /**
   * Counts records
   * @abstract
   * @param {String} model
   * @param {Object} conditions
   * @param {Object} options
   * @return {Number}
   * @promise
   * @see Query::count
   */
  public async count(model, conditions, options) {
    return Promise.reject(new Error('not implemented'));
  }

  /**
   * Deletes records from the database
   * @abstract
   * @param {String} model
   * @param {Object} conditions
   * @return {Number}
   * @promise
   * @see Query::delete
   */
  public async delete(model, conditions) {
    return Promise.reject(new Error('not implemented'));
  }

  /**
   * Closes connection
   */
  public close() { }

  protected _getModelID(data) {
    return data.id;
  }

  protected valueToModel(value, property) {
    if (property.type_class === types.Object || property.array) {
      return JSON.parse(value);
    } else {
      return value;
    }
  }

  protected _convertToModelInstance(model, data, options) {
    var id, instance, modelClass;
    if (options.lean) {
      model = this._connection.models[model];
      instance = {};
      this.setValuesFromDB(instance, data, model._schema, options.select);
      model._collapseNestedNulls(instance, options.select_raw, null);
      instance.id = this._getModelID(data);
      return instance;
    } else {
      id = this._getModelID(data);
      modelClass = this._connection.models[model];
      return new modelClass(data, id, options.select, options.select_raw);
    }
  }

  protected _convertToGroupInstance(model, data, group_by, group_fields) {
    var expr, field, i, instance, len, op, property, schema;
    instance = {};
    if (group_by) {
      schema = this._connection.models[model]._schema;
      for (i = 0, len = group_by.length; i < len; i++) {
        field = group_by[i];
        property = schema[field];
        if (property) {
          instance[field] = this.valueToModel(data[field], property);
        }
      }
    }
    for (field in group_fields) {
      expr = group_fields[field];
      op = Object.keys(expr)[0];
      if (op === '$sum' || op === '$max' || op === '$min') {
        instance[field] = Number(data[field]);
      }
    }
    return instance;
  }

  protected async _createBulkDefault(model, data) {
    return await Promise.all(data.map((item) => {
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
