import { AdapterBase } from '../adapters/base';
import { Connection } from '../connection';
import { Query } from '../query';
import * as types from '../types';
declare type ModelCallbackMethod = () => void | 'string';
/**
 * Base class for models
 */
declare class Model {
    /**
     * Tracks changes of a record if true
     */
    static dirty_tracking: boolean;
    /**
     * Archives deleted records in the archive table
     */
    static archive: boolean;
    /**
     * Applies the lean option for all queries for this Model
     */
    static lean_query: boolean;
    static tableName: string;
    /**
     * Indicates the connection associated to this model
     * @see Model.connection
     * @private
     */
    static _connection: Connection;
    /**
     * Indicates the adapter associated to this model
     * @private
     * @see Model.connection
     */
    static _adapter: AdapterBase;
    static _name: string;
    static _schema: any;
    static _indexes: any[];
    static _integrities: any[];
    static _associations: {
        [column: string]: any;
    };
    static _initialize_called: boolean;
    static _intermediate_paths: any;
    static initialize(): void;
    /**
     * Returns a new model class extending Model
     */
    static newModel(connection: Connection, name: string, schema: any): typeof Model;
    /**
     * Sets a connection of this model
     *
     * If this methods was not called explicitly, this model will use Connection.defaultConnection
     */
    static connection(connection: Connection, name?: string): void;
    static _checkConnection(): void;
    static _checkReady(): Promise<void>;
    /**
     * Adds a column to this model
     */
    static column(path: string, property: any): void;
    /**
     * Adds an index to this model
     */
    static index(columns: any, options?: any): void;
    /**
     * Drops this model from the database
     * @see AdapterBase::drop
     */
    static drop(): Promise<void>;
    /**
     * Creates a record.
     * 'Model.build(data)' is the same as 'new Model(data)'
     */
    static build<T extends Model, U extends T>(data?: U): T;
    /**
     * Deletes all records from the database
     */
    static deleteAll(): Promise<void>;
    /**
     * Adds a has-many association
     */
    static hasMany(target_model_or_column: any, options: any): void;
    /**
     * Adds a has-one association
     */
    static hasOne(target_model_or_column: any, options: any): void;
    /**
     * Adds a belongs-to association
     */
    static belongsTo(target_model_or_column: any, options: any): void;
    static inspect(depth: number): string;
    static _getKeyType(target_connection?: Connection): any;
    /**
     * Set nested object null if all children are null
     */
    static _collapseNestedNulls(instance: any, selected_columns_raw: any, intermediates: any): void;
    static _loadFromCache(this: typeof Model, key: string, refresh?: boolean): Promise<any>;
    static _saveToCache(this: typeof Model, key: string, ttl: number, data: any): Promise<void>;
    static removeCache(this: typeof Model, key: string): Promise<void>;
    /**
     * Adds a callback of after initializing
     */
    static afterInitialize(method: ModelCallbackMethod): void;
    /**
     * Adds a callback of after finding
     */
    static afterFind(method: ModelCallbackMethod): void;
    /**
     * Adds a callback of before saving
     */
    static beforeSave(method: ModelCallbackMethod): void;
    /**
     * Adds a callback of after saving
     */
    static afterSave(method: ModelCallbackMethod): void;
    /**
     * Adds a callback of before creating
     */
    static beforeCreate(method: ModelCallbackMethod): void;
    /**
     * Adds a callback of after creating
     */
    static afterCreate(method: ModelCallbackMethod): void;
    /**
     * Adds a callback of before updating
     */
    static beforeUpdate(method: ModelCallbackMethod): void;
    /**
     * Adds a callback of after updating
     */
    static afterUpdate(method: ModelCallbackMethod): void;
    /**
     * Adds a callback of before destroying
     */
    static beforeDestroy(method: ModelCallbackMethod): void;
    /**
     * Adds a callback of after destroying
     */
    static afterDestroy(method: ModelCallbackMethod): void;
    /**
     * Adds a callback of before validating
     */
    static beforeValidate(method: ModelCallbackMethod): void;
    /**
     * Adds a callback of after validating
     */
    static afterValidate(method: ModelCallbackMethod): void;
    /**
     * Creates a record and saves it to the database
     * 'Model.create(data)' is the same as 'Model.build(data).save()'
     */
    static create<T extends Model, U extends T>(data?: U, options?: {
        skip_log: boolean;
    }): Promise<T>;
    /**
     * Creates multiple records and saves them to the database.
     */
    static createBulk<T extends Model, U extends T>(this: typeof Model, data?: U[]): Promise<T[]>;
    /**
     * Creates q query object
     */
    static query(this: typeof Model): Query<Model>;
    /**
     * Finds a record by id
     * @throws {Error('not found')}
     */
    static find(this: typeof Model, id: types.RecordID | types.RecordID[]): Query<Model>;
    /**
     * Finds records by ids while preserving order.
     * @throws {Error('not found')}
     */
    static findPreserve(ids: types.RecordID[]): Query<Model>;
    /**
     * Finds records by conditions
     */
    static where(condition?: object): Query<Model>;
    /**
     * Selects columns for result
     */
    static select(columns: string): Query<Model>;
    /**
     * Specifies orders of result
     */
    static order(orders: string): Query<Model>;
    /**
     * Groups result records
     */
    static group<U = Model>(this: typeof Model, group_by: string | null, fields: object): Query<U>;
    /**
     * Counts records by conditions
     */
    static count(this: typeof Model, condition: object): Promise<number>;
    /**
     * Updates some fields of records that match conditions
     */
    static update(this: typeof Model, updates: object, condition: object): Promise<number>;
    /**
     * Deletes records by conditions
     */
    static delete(this: typeof Model, condition?: object): Promise<number>;
    /**
     * Adds 'created_at' and 'updated_at' fields to records
     */
    static timestamps(): void;
    /**
     * Adds a validator
     * A validator must return false(boolean) or error message(string), or throw an Error exception if invalid
     */
    static addValidator(validator: any): void;
    private static _validators;
    private static _callbacks_map;
    /**
     * Adds a callback
     */
    private static addCallback;
    private static _buildSaveDataColumn;
    private static _createBulk;
    private static _validateType;
    private static _validateColumn;
    id: any;
    private _intermediates;
    private _prev_attributes;
    private _attributes;
    /**
     * Creates a record
     */
    constructor(data?: object);
    /**
     * Returns true if there is some changed columns
     */
    isDirty(): boolean;
    /**
     * Returns the list of paths of changed columns
     */
    getChanged(): string[];
    /**
     * Returns the current value of the column of the given path
     */
    get(path: any): any;
    /**
     * Returns the original value of the column of the given path
     */
    getPrevious(path: any): any;
    /**
     * Changes the value of the column of the given path
     */
    set(path: any, value: any): void;
    /**
     * Resets all changes
     */
    reset(): void;
    /**
     * Destroys this record (remove from the database)
     */
    destroy(): Promise<void>;
    _defineProperty(object: any, key: any, path: any, enumerable: any): void;
    /**
     * Saves data to the database
     */
    save(this: Model & {
        constructor: typeof Model;
    }, options?: {
        skip_log?: boolean;
        validate?: boolean;
    }): Promise<Model & {
        constructor: typeof Model;
    }>;
    /**
     * Validates data
     */
    validate(): void;
    private _runCallbacks;
    private _buildSaveData;
    private _create;
    private _update;
}
export { Model };
