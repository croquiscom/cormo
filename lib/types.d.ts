/**
 * CORMO types
 * @module types
 * @namespace cormo
 */
export declare type ColumnType = 'string' | ICormoTypesString | ICormoTypesStringConstructor | StringConstructor | 'number' | ICormoTypesNumber | ICormoTypesNumberConstructor | NumberConstructor | 'boolean' | ICormoTypesBoolean | ICormoTypesBooleanConstructor | BooleanConstructor | 'integer' | ICormoTypesInteger | ICormoTypesIntegerConstructor | 'geopoint' | ICormoTypesGeoPoint | ICormoTypesGeoPointConstructor | 'date' | ICormoTypesDate | ICormoTypesDateConstructor | DateConstructor | 'object' | ICormoTypesObject | ICormoTypesObjectConstructor | ObjectConstructor | 'recordid' | ICormoTypesRecordID | ICormoTypesRecordIDConstructor | 'text' | ICormoTypesText | ICormoTypesTextConstructor;
export declare type ColumnTypeInternal = ICormoTypesString | ICormoTypesNumber | ICormoTypesBoolean | ICormoTypesInteger | ICormoTypesGeoPoint | ICormoTypesDate | ICormoTypesObject | ICormoTypesRecordID | ICormoTypesText;
/**
 * Represents a string, used in model schemas.
 * @memberOf types
 */
interface ICormoTypesString {
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
interface ICormoTypesNumber {
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
interface ICormoTypesBoolean {
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
interface ICormoTypesInteger {
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
interface ICormoTypesGeoPoint {
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
interface ICormoTypesDate {
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
interface ICormoTypesObject {
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
interface ICormoTypesRecordID {
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
interface ICormoTypesText {
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
