/// <reference types="node" />
import * as stream from 'stream';
/**
 * Base class for adapters
 * @namespace adapter
 */
declare class AdapterBase {
    /**
     * Wraps adapter specific errors
     * @param msg CORMO's error message
     * @param cause adapter specific error object
     */
    protected static wrapError(msg: string, cause: Error): Error;
    support_fractional_seconds: boolean;
    support_upsert: boolean;
    /**
     * Returns current schemas.
     * @abstract
     * @see Connection::applySchemas
     */
    getSchemas(): Promise<{
        tables: any[];
    }>;
    /** Creates a table.
     * @abstract
     * @see Connection::applySchemas
     */
    createTable(model: string): Promise<void>;
    /** Adds a column to a table
     * @abstract
     * @see Connection::applySchemas
     */
    addColumn(model: string, column_property: object): Promise<void>;
    /** Creates an index.
     * @abstract
     * @see Connection::applySchemas
     */
    createIndex(model: string, index: {}): Promise<void>;
    /** Creates a foreign key.
     * @abstract
     * @see Connection::applySchemas
     */
    createForeignKey(model: string, column: string, type: string, references: {}): Promise<void>;
    /**
     * Drops a model from the database
     * @abstract
     * @see Model.drop
     */
    drop(model: string): Promise<void>;
    idToDB(value: any): any;
    valueToDB(value: any, column: any, property: any): any;
    setValuesFromDB(instance: any, data: any, schema: any, selected_columns: any): void[];
    /**
     * Creates a record
     * @abstract
     * @promise
     */
    create(model: string, data: object): Promise<any>;
    /**
     * Creates records
     * @abstract
     * @param {String} model
     * @param {Array<Object>} data
     * @return {Array<RecordID>}
     * @promise
     */
    createBulk(model: string, data: object[]): Promise<any[]>;
    /**
     * Updates a record
     * @abstract
     */
    update(model: string, data: any): Promise<void>;
    /**
     * Updates some fields of records that match conditions
     * @abstract
     */
    updatePartial(model: string, data: any, conditions: any, options: any): Promise<void>;
    /**
     * Updates some fields of records that match conditions or inserts a new record
     * @abstract
     */
    upsert(model: string, data: any, conditions: any, options: any): Promise<void>;
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
    findById(model: any, id: any, options: any): Promise<never>;
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
    find(model: any, conditions: any, options: any): Promise<never>;
    /**
     * Streams matching records
     * @abstract
     * @param {String} model
     * @param {Object} conditions
     * @param {Object} options
     * @return {Readable}
     * @see Query::stream
     */
    stream(model: any, conditions: any, options: any): stream.Readable;
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
    count(model: any, conditions: any, options: any): Promise<never>;
    /**
     * Deletes records from the database
     * @abstract
     * @param {String} model
     * @param {Object} conditions
     * @return {Number}
     * @promise
     * @see Query::delete
     */
    delete(model: any, conditions: any): Promise<never>;
    /**
     * Closes connection
     */
    close(): void;
    protected _getModelID(data: any): any;
    protected valueToModel(value: any, property: any): any;
    protected _convertToModelInstance(model: any, data: any, options: any): any;
    protected _convertToGroupInstance(model: any, data: any, group_by: any, group_fields: any): {};
    protected _createBulkDefault(model: any, data: any): Promise<[{}, {}, {}, {}, {}, {}, {}, {}, {}, {}]>;
}
export { AdapterBase };
