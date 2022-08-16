/**
 * CORMO types
 * @module types
 * @namespace cormo
 */
/**
 * Represents a string, used in model schemas.
 * @namespace types
 * @class String
 */
export interface CormoTypesString {
    _type: 'string';
    length?: number;
}
interface CormoTypesStringConstructor {
    new (length?: number): CormoTypesString;
    (length?: number): CormoTypesString;
}
declare const CormoTypesString: CormoTypesStringConstructor;
/**
 * Represents a double-precision floating-point, used in model schemas.
 * @namespace types
 * @class Number
 */
export interface CormoTypesNumber {
    _type: 'number';
}
interface CormoTypesNumberConstructor {
    new (): CormoTypesNumber;
    (): CormoTypesNumber;
}
declare const CormoTypesNumber: CormoTypesNumberConstructor;
/**
 * Represents a boolean, used in model schemas.
 * @namespace types
 * @class Boolean
 */
export interface CormoTypesBoolean {
    _type: 'boolean';
}
interface CormoTypesBooleanConstructor {
    new (): CormoTypesBoolean;
    (): CormoTypesBoolean;
}
declare const CormoTypesBoolean: CormoTypesBooleanConstructor;
/**
 * Represents a 32bit integer, used in model schemas.
 * @namespace types
 * @class Integer
 */
export interface CormoTypesInteger {
    _type: 'integer';
}
interface CormoTypesIntegerConstructor {
    new (): CormoTypesInteger;
    (): CormoTypesInteger;
}
declare const CormoTypesInteger: CormoTypesIntegerConstructor;
/**
 * Represents a 54bit(JS limit) integer, used in model schemas.
 * @namespace types
 * @class BigInteger
 */
export interface CormoTypesBigInteger {
    _type: 'biginteger';
}
interface CormoTypesBigIntegerConstructor {
    new (): CormoTypesBigInteger;
    (): CormoTypesBigInteger;
}
declare const CormoTypesBigInteger: CormoTypesBigIntegerConstructor;
/**
 * Represents a two-dimensional point, used in model schemas.
 *
 * This type is supported only in MongoDB and MySQL.
 * @namespace types
 * @class GeoPoint
 */
export interface CormoTypesGeoPoint {
    _type: 'geopoint';
}
interface CormoTypesGeoPointConstructor {
    new (): CormoTypesGeoPoint;
    (): CormoTypesGeoPoint;
}
declare const CormoTypesGeoPoint: CormoTypesGeoPointConstructor;
/**
 * Represents a date, used in model schemas.
 * @namespace types
 * @class Date
 */
export interface CormoTypesDate {
    _type: 'date';
}
interface CormoTypesDateConstructor {
    new (): CormoTypesDate;
    (): CormoTypesDate;
}
declare const CormoTypesDate: CormoTypesDateConstructor;
/**
 * Represents a general object, used in model schemas.
 *
 * A value of this type will be converted to a JSON string
 * if the adapter does not support a general object.
 * @namespace types
 * @class Object
 */
export interface CormoTypesObject {
    _type: 'object';
}
interface CormoTypesObjectConstructor {
    new (): CormoTypesObject;
    (): CormoTypesObject;
}
declare const CormoTypesObject: CormoTypesObjectConstructor;
/**
 * Represents a record id, used in model schemas.
 * @namespace types
 * @class RecordID
 */
export interface CormoTypesRecordID {
    _type: 'recordid';
}
interface CormoTypesRecordIDConstructor {
    new (): CormoTypesRecordID;
    (): CormoTypesRecordID;
}
declare const CormoTypesRecordID: CormoTypesRecordIDConstructor;
/**
 * Represents a text, used in model schemas.
 * @namespace types
 * @class Text
 */
export interface CormoTypesText {
    _type: 'text';
}
interface CormoTypesTextConstructor {
    new (): CormoTypesText;
    (): CormoTypesText;
}
declare const CormoTypesText: CormoTypesTextConstructor;
export declare type ColumnTypeInternal = CormoTypesString | CormoTypesNumber | CormoTypesBoolean | CormoTypesDate | CormoTypesObject | CormoTypesInteger | CormoTypesBigInteger | CormoTypesGeoPoint | CormoTypesRecordID | CormoTypesText;
export declare type ColumnTypeInternalConstructor = CormoTypesStringConstructor | CormoTypesNumberConstructor | CormoTypesBooleanConstructor | CormoTypesDateConstructor | CormoTypesObjectConstructor | CormoTypesIntegerConstructor | CormoTypesBigIntegerConstructor | CormoTypesGeoPointConstructor | CormoTypesRecordIDConstructor | CormoTypesTextConstructor;
declare type ColumnTypeNativeConstructor = StringConstructor | NumberConstructor | BooleanConstructor | DateConstructor | ObjectConstructor;
declare type ColumnTypeString = 'string' | 'number' | 'boolean' | 'date' | 'object' | 'integer' | 'biginteger' | 'geopoint' | 'recordid' | 'text';
export declare type ColumnType = ColumnTypeInternal | ColumnTypeInternalConstructor | ColumnTypeNativeConstructor | ColumnTypeString;
/**
 * Converts JavaScript built-in class to CORMO type
 * @private
 */
declare function _toCORMOType(type: ColumnType): ColumnTypeInternal;
export { CormoTypesString as String, CormoTypesNumber as Number, CormoTypesBoolean as Boolean, CormoTypesInteger as Integer, CormoTypesBigInteger as BigInteger, CormoTypesGeoPoint as GeoPoint, CormoTypesDate as Date, CormoTypesObject as Object, CormoTypesRecordID as RecordID, CormoTypesText as Text, _toCORMOType, };
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
 * A pseudo type represents an big integer
 * @namespace ptypes
 */
export declare type BigInteger = number;
/**
 * A pseudo type represents a two - dimensional point
 * @namespace ptypes
 */
export declare type GeoPoint = [number, number];
