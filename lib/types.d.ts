/**
 * CORMO types
 * @module types
 * @namespace cormo
 */
export declare type ColumnTypeInternal = ICormoTypesString | ICormoTypesNumber | ICormoTypesBoolean | ICormoTypesDate | ICormoTypesObject | ICormoTypesInteger | ICormoTypesGeoPoint | ICormoTypesRecordID | ICormoTypesText;
export declare type ColumnTypeInternalConstructor = ICormoTypesStringConstructor | ICormoTypesNumberConstructor | ICormoTypesBooleanConstructor | ICormoTypesDateConstructor | ICormoTypesObjectConstructor | ICormoTypesIntegerConstructor | ICormoTypesGeoPointConstructor | ICormoTypesRecordIDConstructor | ICormoTypesTextConstructor;
declare type ColumnTypeNativeConstructor = StringConstructor | NumberConstructor | BooleanConstructor | DateConstructor | ObjectConstructor;
declare type ColumnTypeString = 'string' | 'number' | 'boolean' | 'date' | 'object' | 'integer' | 'geopoint' | 'recordid' | 'text';
export declare type ColumnType = ColumnTypeInternal | ColumnTypeInternalConstructor | ColumnTypeNativeConstructor | ColumnTypeString;
/**
 * Represents a string, used in model schemas.
 * @memberOf types
 */
export interface ICormoTypesString {
    _type: 'string';
    length?: number;
}
interface ICormoTypesStringConstructor {
    new (length?: number): ICormoTypesString;
    (length?: number): ICormoTypesString;
}
declare const CormoTypesString: ICormoTypesStringConstructor;
/**
 * Represents a double-precision floating-point, used in model schemas.
 * @memberOf types
 */
export interface ICormoTypesNumber {
    _type: 'number';
}
interface ICormoTypesNumberConstructor {
    new (): ICormoTypesNumber;
    (): ICormoTypesNumber;
}
declare const CormoTypesNumber: ICormoTypesNumberConstructor;
/**
 * Represents a boolean, used in model schemas.
 * @memberOf types
 */
export interface ICormoTypesBoolean {
    _type: 'boolean';
}
interface ICormoTypesBooleanConstructor {
    new (): ICormoTypesBoolean;
    (): ICormoTypesBoolean;
}
declare const CormoTypesBoolean: ICormoTypesBooleanConstructor;
/**
 * Represents a 32bit integer, used in model schemas.
 * @memberOf types
 */
export interface ICormoTypesInteger {
    _type: 'integer';
}
interface ICormoTypesIntegerConstructor {
    new (): ICormoTypesInteger;
    (): ICormoTypesInteger;
}
declare const CormoTypesInteger: ICormoTypesIntegerConstructor;
/**
 * Represents a two-dimensional point, used in model schemas.
 *
 * This type is supported only in MongoDB and MySQL.
 * @memberOf types
 */
export interface ICormoTypesGeoPoint {
    _type: 'geopoint';
}
interface ICormoTypesGeoPointConstructor {
    new (): ICormoTypesGeoPoint;
    (): ICormoTypesGeoPoint;
}
declare const CormoTypesGeoPoint: ICormoTypesGeoPointConstructor;
/**
 * Represents a date, used in model schemas.
 * @memberOf types
 */
export interface ICormoTypesDate {
    _type: 'date';
}
interface ICormoTypesDateConstructor {
    new (): ICormoTypesDate;
    (): ICormoTypesDate;
}
declare const CormoTypesDate: ICormoTypesDateConstructor;
/**
 * Represents a general object, used in model schemas.
 *
 * A value of this type will be converted to a JSON string
 * if the adapter does not support a general object.
 * @memberOf types
 */
export interface ICormoTypesObject {
    _type: 'object';
}
interface ICormoTypesObjectConstructor {
    new (): ICormoTypesObject;
    (): ICormoTypesObject;
}
declare const CormoTypesObject: ICormoTypesObjectConstructor;
/**
 * Represents a record id, used in model schemas.
 * @memberOf types
 */
export interface ICormoTypesRecordID {
    _type: 'recordid';
}
interface ICormoTypesRecordIDConstructor {
    new (): ICormoTypesRecordID;
    (): ICormoTypesRecordID;
}
declare const CormoTypesRecordID: ICormoTypesRecordIDConstructor;
/**
 * Represents a text, used in model schemas.
 * @memberOf types
 */
export interface ICormoTypesText {
    _type: 'text';
}
interface ICormoTypesTextConstructor {
    new (): ICormoTypesText;
    (): ICormoTypesText;
}
declare const CormoTypesText: ICormoTypesTextConstructor;
/**
 * Converts JavaScript built-in class to CORMO type
 * @private
 */
declare function _toCORMOType(type: ColumnType): ColumnTypeInternal;
export { CormoTypesString as String, CormoTypesNumber as Number, CormoTypesBoolean as Boolean, CormoTypesInteger as Integer, CormoTypesGeoPoint as GeoPoint, CormoTypesDate as Date, CormoTypesObject as Object, CormoTypesRecordID as RecordID, CormoTypesText as Text, _toCORMOType, };
/**
 * A pseudo type represents a record's unique identifier.
 *
 * Its real type differs by adapters.
 *
 * * String for MongoDB
 * * Integer for MySQL, SQLite3, PostegreSQL
 * @namespace ptypes
 */
export declare type RecordID = string | number;
/**
 * A pseudo type represents an integer
 * @namespace ptypes
 */
export declare type Integer = number;
/**
 * A pseudo type represents a two - dimensional point
 * @namespace ptypes
 */
export declare type GeoPoint = [number, number];
