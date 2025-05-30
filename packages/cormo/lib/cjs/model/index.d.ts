import { inspect } from 'util';
import { AdapterBase } from '../adapters/base.js';
import { Connection, AssociationBelongsToOptions, AssociationHasManyOptions, AssociationHasOneOptions } from '../connection/index.js';
import { QueryArray, QuerySingle } from '../query.js';
import { Transaction } from '../transaction.js';
import * as types from '../types.js';
type ModelCallbackMethod = () => void | 'string';
export type ModelColumnNames<M> = Exclude<keyof M, keyof BaseModel>;
export type ModelColumnNamesWithId<M> = Exclude<keyof M, Exclude<keyof BaseModel, 'id'>>;
export type ModelValueObject<M> = Pick<M, ModelColumnNames<M>>;
export type ModelValueObjectWithId<M> = Pick<M, ModelColumnNamesWithId<M>>;
export interface ColumnProperty {
    type: types.ColumnType | types.ColumnType[];
    array?: boolean;
    required?: boolean;
    unique?: boolean;
    connection?: Connection;
    name?: string;
    description?: string;
    default_value?: string | number | (() => string | number);
}
export interface ColumnPropertyInternal extends ColumnProperty {
    type: types.ColumnTypeInternal;
    record_id?: boolean;
    type_class: types.ColumnTypeInternalConstructor;
    _parts: string[];
    _parts_db: string[];
    _dbname_dot: string;
    _dbname_us: string;
    primary_key: boolean;
}
export interface ColumnNestedProperty {
    [subcolumn: string]: types.ColumnType | types.ColumnType[] | ColumnProperty | ColumnNestedProperty;
}
export interface ModelSchema {
    [path: string]: types.ColumnType | types.ColumnType[] | ColumnProperty | ColumnNestedProperty;
}
export interface ModelSchemaInternal {
    [path: string]: ColumnPropertyInternal | undefined;
}
/**
 * Base class for models
 */
declare class BaseModel {
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
    /**
     * Forces to return record id as string.
     * It remains as number on the persisted record if the adapter uses number for record id.
     */
    static query_record_id_as_string: boolean;
    static table_name: string;
    static description?: string;
    /**
     * Indicates the connection associated to this model
     */
    static _connection: Connection;
    /**
     * Indicates the adapter associated to this model
     */
    static _adapter: AdapterBase;
    static _name: string;
    static _schema: ModelSchemaInternal;
    static _object_column_classes?: Array<{
        column: string;
        klass: any;
    }>;
    static _integrities: Array<{
        type: string;
        column: string;
        child?: typeof BaseModel;
        parent?: typeof BaseModel;
    }>;
    static _associations: {
        [column: string]: any;
    };
    static _initialize_called: boolean;
    static _intermediate_paths: any;
    static _property_decorators?: any[];
    static initialize(): void;
    /**
     * Returns a new model class extending BaseModel
     */
    static newModel(connection: Connection, name: string, schema: ModelSchema): typeof BaseModel;
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
    static column(path: string, type_or_property: types.ColumnType | types.ColumnType[] | ColumnProperty | ColumnNestedProperty): void;
    /**
     * Adds an index to this model
     */
    static index(columns: {
        [column: string]: 1 | -1;
    }, options?: {
        name?: string;
        unique?: boolean;
    }): void;
    /**
     * Drops this model from the database
     * @see AdapterBase::drop
     */
    static drop(): Promise<void>;
    /**
     * Creates a record.
     * 'Model.build(data)' is the same as 'new Model(data)'
     */
    static build<M extends BaseModel>(this: new (data_arg?: any) => M, data: ModelValueObjectWithId<M>, options: {
        use_id_in_data: true;
    }): M;
    static build<M extends BaseModel>(this: new (data_arg?: any) => M, data?: ModelValueObject<M>, options?: {
        use_id_in_data?: boolean;
    }): M;
    /**
     * Deletes all records from the database
     */
    static deleteAll(): Promise<void>;
    /**
     * Adds a has-many association
     */
    static hasMany(target_model_or_column: string | typeof BaseModel, options?: AssociationHasManyOptions): void;
    /**
     * Adds a has-one association
     */
    static hasOne(target_model_or_column: string | typeof BaseModel, options?: AssociationHasOneOptions): void;
    /**
     * Adds a belongs-to association
     */
    static belongsTo(target_model_or_column: string | typeof BaseModel, options?: AssociationBelongsToOptions): void;
    static [inspect.custom](_depth: number): string;
    static _getKeyType(target_connection?: Connection<AdapterBase>): any;
    /**
     * Set nested object null if all children are null
     */
    static _collapseNestedNulls(instance: any, selected_columns_raw: any, intermediates: any): void;
    static _loadFromCache(key: string, refresh?: boolean): Promise<any>;
    static _saveToCache(key: string, ttl: number, data: any): Promise<void>;
    static removeCache(key: string): Promise<void>;
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
    static create<M extends BaseModel>(this: (new (data_arg?: any) => M) & typeof BaseModel, data: ModelValueObjectWithId<M>, options: {
        transaction?: Transaction;
        skip_log?: boolean;
        use_id_in_data: true;
    }): Promise<M>;
    static create<M extends BaseModel>(this: (new (data_arg?: any) => M) & typeof BaseModel, data?: ModelValueObject<M>, options?: {
        transaction?: Transaction;
        skip_log?: boolean;
        use_id_in_data?: boolean;
    }): Promise<M>;
    /**
     * Creates multiple records and saves them to the database.
     */
    static createBulk<M extends BaseModel>(this: (new (data_arg?: any) => M) & typeof BaseModel, data: Array<ModelValueObjectWithId<M>>, options: {
        transaction?: Transaction;
        use_id_in_data: true;
    }): Promise<M[]>;
    static createBulk<M extends BaseModel>(this: (new (data_arg?: any) => M) & typeof BaseModel, data?: Array<ModelValueObject<M>>, options?: {
        transaction?: Transaction;
        use_id_in_data?: boolean;
    }): Promise<M[]>;
    /**
     * Creates q query object
     */
    static query<M extends BaseModel>(this: (new (data?: any) => M) & typeof BaseModel, options?: {
        transaction?: Transaction;
    }): QueryArray<M>;
    /**
     * Finds a record by id
     * @throws {Error('not found')}
     */
    static find<M extends BaseModel>(this: (new (data?: any) => M) & typeof BaseModel, id: types.RecordID, options?: {
        transaction?: Transaction;
    }): QuerySingle<M>;
    static find<M extends BaseModel>(this: (new (data?: any) => M) & typeof BaseModel, id: types.RecordID[], options?: {
        transaction?: Transaction;
    }): QueryArray<M>;
    /**
     * Finds records by ids while preserving order.
     * @throws {Error('not found')}
     */
    static findPreserve<M extends BaseModel>(this: (new (data?: any) => M) & typeof BaseModel, ids: types.RecordID[], options?: {
        transaction?: Transaction;
    }): QueryArray<M>;
    /**
     * Finds records by conditions
     */
    static where<M extends BaseModel>(this: (new (data?: any) => M) & typeof BaseModel, condition?: object, options?: {
        transaction?: Transaction;
    }): QueryArray<M>;
    /**
     * Selects columns for result
     */
    static select<M extends BaseModel, K extends ModelColumnNamesWithId<M>>(this: (new (data?: any) => M) & typeof BaseModel, columns: K[], options?: {
        transaction?: Transaction;
    }): QueryArray<M, Pick<M, K>>;
    static select<M extends BaseModel, K extends ModelColumnNamesWithId<M>>(this: (new (data?: any) => M) & typeof BaseModel, columns?: string, options?: {
        transaction?: Transaction;
    }): QueryArray<M, Pick<M, K>>;
    /**
     * Specifies orders of result
     */
    static order<M extends BaseModel>(this: (new (data?: any) => M) & typeof BaseModel, orders: string, options?: {
        transaction?: Transaction;
    }): QueryArray<M>;
    /**
     * Groups result records
     */
    static group<M extends BaseModel, G extends ModelColumnNamesWithId<M>, F>(this: (new (data?: any) => M) & typeof BaseModel, group_by: G | G[], fields?: F, options?: {
        transaction?: Transaction;
    }): QueryArray<M, {
        [field in keyof F]: number;
    } & Pick<M, G>>;
    static group<M extends BaseModel, F>(this: (new (data?: any) => M) & typeof BaseModel, group_by: null, fields?: F, options?: {
        transaction?: Transaction;
    }): QueryArray<M, {
        [field in keyof F]: number;
    }>;
    static group<M extends BaseModel, U>(this: (new (data?: any) => M) & typeof BaseModel, group_by: string | null, fields?: object, options?: {
        transaction?: Transaction;
    }): QueryArray<M, U>;
    /**
     * Counts records by conditions
     */
    static count(condition?: object, options?: {
        transaction?: Transaction;
    }): Promise<number>;
    /**
     * Updates some fields of records that match conditions
     */
    static update(updates: any, condition?: object, options?: {
        transaction?: Transaction;
    }): Promise<number>;
    /**
     * Deletes records by conditions
     */
    static delete(condition?: object, options?: {
        transaction?: Transaction;
    }): Promise<number>;
    /**
     * Adds 'created_at' and 'updated_at' fields to records
     */
    static timestamps(): void;
    /**
     * Adds a validator
     * A validator must return false(boolean) or error message(string), or throw an Error exception if invalid
     */
    static addValidator(validator: any): void;
    static _buildSaveDataColumn(data: any, model: any, column: string, property: ColumnPropertyInternal, allow_null?: boolean): void;
    static _validateColumn(data: any, column: string, property: ColumnPropertyInternal, for_update?: boolean): void;
    private static _validators;
    private static _callbacks_map?;
    /**
     * Adds a callback
     */
    private static addCallback;
    private static _createBulk;
    private static _validateType;
    readonly id?: any;
    private _intermediates?;
    private _prev_attributes?;
    private _attributes?;
    private _is_persisted?;
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
    save(options?: {
        transaction?: Transaction;
        skip_log?: boolean;
        validate?: boolean;
        use_id_in_data?: boolean;
    }): Promise<this>;
    /**
     * Validates data
     */
    validate(): void;
    private _runCallbacks;
    private _buildSaveData;
    private _create;
    private _update;
    static applyDefaultValues(obj: any): string[];
}
export { BaseModel };
