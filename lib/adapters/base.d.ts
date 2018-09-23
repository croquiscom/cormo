/// <reference types="node" />
import * as stream from 'stream';
export interface ISchemas {
    tables: {
        [table_name: string]: any;
    };
    indexes?: {
        [table_name: string]: any;
    };
    foreign_keys?: {
        [table_name: string]: any;
    };
}
/**
 * Base class for adapters
 * @namespace adapter
 */
declare abstract class AdapterBase {
    /**
     * Wraps adapter specific errors
     * @param msg CORMO's error message
     * @param cause adapter specific error object
     */
    static wrapError(msg: string, cause?: Error): Error;
    _connection: any;
    support_fractional_seconds: boolean;
    support_upsert: boolean;
    support_nested: boolean;
    support_geopoint: boolean;
    support_string_type_with_length: boolean;
    key_type: any;
    key_type_internal: any;
    native_integrity: boolean;
    connect(settings: {}): Promise<void>;
    /**
     * Returns current schemas.
     * @abstract
     * @see Connection::applySchemas
     */
    getSchemas(): Promise<ISchemas>;
    /**
     * Creates a table.
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
     * @see BaseModel.drop
     */
    drop(model: string): Promise<void>;
    idToDB(value: any): any;
    valueToDB(value: any, column: any, property: any): any;
    setValuesFromDB(instance: any, data: any, schema: any, selected_columns: any): void[];
    /**
     * Creates a record
     */
    abstract create(model: string, data: object): Promise<any>;
    /**
     * Creates records
     */
    abstract createBulk(model: string, data: object[]): Promise<any[]>;
    /**
     * Updates a record
     */
    abstract update(model: string, data: any): Promise<void>;
    /**
     * Updates some fields of records that match conditions
     */
    abstract updatePartial(model: string, data: any, conditions: any, options: any): Promise<number>;
    /**
     * Updates some fields of records that match conditions or inserts a new record
     */
    abstract upsert(model: string, data: any, conditions: any, options: any): Promise<void>;
    /**
     * Finds a record by id
     * @see Query::exec
     */
    abstract findById(model: any, id: any, options: any): Promise<any>;
    /**
     * Finds records
     * @see Query::exec
     */
    abstract find(model: any, conditions: any, options: any): Promise<any>;
    /**
     * Streams matching records
     * @see Query::stream
     */
    abstract stream(model: any, conditions: any, options: any): stream.Readable;
    /**
     * Counts records
     * @see Query::count
     */
    abstract count(model: any, conditions: any, options: any): Promise<number>;
    /**
     * Deletes records from the database
     * @see Query::delete
     */
    abstract delete(model: any, conditions: any): Promise<number>;
    /**
     * Closes connection
     */
    abstract close(): void;
    protected _getModelID(data: any): any;
    protected valueToModel(value: any, property: any): any;
    protected _convertToModelInstance(model: any, data: any, options: any): any;
    protected _convertToGroupInstance(model: any, data: any, group_by: any, group_fields: any): any;
    protected _createBulkDefault(model: any, data: any): Promise<[{}, {}, {}, {}, {}, {}, {}, {}, {}, {}]>;
}
export { AdapterBase };
