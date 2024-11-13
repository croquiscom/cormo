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

export interface CormoTypesStringConstructor {
  new (length?: number): CormoTypesString;
  (length?: number): CormoTypesString;
}

const CormoTypesString: CormoTypesStringConstructor = function (this: CormoTypesString, length?: number): void {
  if (!(this instanceof CormoTypesString)) {
    return new (CormoTypesString as any)(length);
  }
  this.length = length;
  this.toString = () => (this.length ? `string(${this.length})` : 'string');
} as CormoTypesStringConstructor;

/**
 * Represents a double-precision floating-point, used in model schemas.
 * @namespace types
 * @class Number
 */
export interface CormoTypesNumber {
  _type: 'number';
}

export interface CormoTypesNumberConstructor {
  new (): CormoTypesNumber;
  (): CormoTypesNumber;
}

const CormoTypesNumber: CormoTypesNumberConstructor = function (this: CormoTypesNumber): void {
  if (!(this instanceof CormoTypesNumber)) {
    return new (CormoTypesNumber as any)();
  }
  this.toString = () => 'number';
} as CormoTypesNumberConstructor;

/**
 * Represents a boolean, used in model schemas.
 * @namespace types
 * @class Boolean
 */
export interface CormoTypesBoolean {
  _type: 'boolean';
}

export interface CormoTypesBooleanConstructor {
  new (): CormoTypesBoolean;
  (): CormoTypesBoolean;
}

const CormoTypesBoolean: CormoTypesBooleanConstructor = function (this: CormoTypesBoolean): void {
  if (!(this instanceof CormoTypesBoolean)) {
    return new (CormoTypesBoolean as any)();
  }
  this.toString = () => 'boolean';
} as CormoTypesBooleanConstructor;

/**
 * Represents a 32bit integer, used in model schemas.
 * @namespace types
 * @class Integer
 */
export interface CormoTypesInteger {
  _type: 'integer';
}

export interface CormoTypesIntegerConstructor {
  new (): CormoTypesInteger;
  (): CormoTypesInteger;
}

const CormoTypesInteger: CormoTypesIntegerConstructor = function (this: CormoTypesInteger): void {
  if (!(this instanceof CormoTypesInteger)) {
    return new (CormoTypesInteger as any)();
  }
  this.toString = () => 'integer';
} as CormoTypesIntegerConstructor;

/**
 * Represents a 54bit(JS limit) integer, used in model schemas.
 * @namespace types
 * @class BigInteger
 */
export interface CormoTypesBigInteger {
  _type: 'biginteger';
}

export interface CormoTypesBigIntegerConstructor {
  new (): CormoTypesBigInteger;
  (): CormoTypesBigInteger;
}

const CormoTypesBigInteger: CormoTypesBigIntegerConstructor = function (this: CormoTypesBigInteger): void {
  if (!(this instanceof CormoTypesBigInteger)) {
    return new (CormoTypesBigInteger as any)();
  }
  this.toString = () => 'biginteger';
} as CormoTypesBigIntegerConstructor;

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

export interface CormoTypesGeoPointConstructor {
  new (): CormoTypesGeoPoint;
  (): CormoTypesGeoPoint;
}

const CormoTypesGeoPoint: CormoTypesGeoPointConstructor = function (this: CormoTypesGeoPoint): void {
  if (!(this instanceof CormoTypesGeoPoint)) {
    return new (CormoTypesGeoPoint as any)();
  }
  this.toString = () => 'geopoint';
} as CormoTypesGeoPointConstructor;

/**
 * Represents a vector, used in model schemas.
 *
 * This type is supported only in PostgreSQL with pgvector
 * @namespace types
 * @class Vector
 */
export interface CormoTypesVector {
  _type: 'vector';
  dimension?: number;
}

export interface CormoTypesVectorConstructor {
  new (dimension?: number): CormoTypesVector;
  (dimension?: number): CormoTypesVector;
}

const CormoTypesVector: CormoTypesVectorConstructor = function (this: CormoTypesVector, dimension?: number): void {
  if (!(this instanceof CormoTypesVector)) {
    return new (CormoTypesVector as any)(dimension);
  }
  this.dimension = dimension;
  this.toString = () => (this.dimension ? `vector(${this.dimension})` : 'vector');
} as CormoTypesVectorConstructor;

/**
 * Represents a date, used in model schemas.
 * @namespace types
 * @class Date
 */
export interface CormoTypesDate {
  _type: 'date';
}

export interface CormoTypesDateConstructor {
  new (): CormoTypesDate;
  (): CormoTypesDate;
}

const CormoTypesDate: CormoTypesDateConstructor = function (this: CormoTypesDate): void {
  if (!(this instanceof CormoTypesDate)) {
    return new (CormoTypesDate as any)();
  }
  this.toString = () => 'date';
} as CormoTypesDateConstructor;

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

export interface CormoTypesObjectConstructor {
  new (): CormoTypesObject;
  (): CormoTypesObject;
}

const CormoTypesObject: CormoTypesObjectConstructor = function (this: CormoTypesObject): void {
  if (!(this instanceof CormoTypesObject)) {
    return new (CormoTypesObject as any)();
  }
  this.toString = () => 'object';
} as CormoTypesObjectConstructor;

/**
 * Represents a record id, used in model schemas.
 * @namespace types
 * @class RecordID
 */
export interface CormoTypesRecordID {
  _type: 'recordid';
}

export interface CormoTypesRecordIDConstructor {
  new (): CormoTypesRecordID;
  (): CormoTypesRecordID;
}

const CormoTypesRecordID: CormoTypesRecordIDConstructor = function (this: CormoTypesRecordID): void {
  if (!(this instanceof CormoTypesRecordID)) {
    return new (CormoTypesRecordID as any)();
  }
  this.toString = () => 'recordid';
} as CormoTypesRecordIDConstructor;

/**
 * Represents a text, used in model schemas.
 * @namespace types
 * @class Text
 */
export interface CormoTypesText {
  _type: 'text';
}

export interface CormoTypesTextConstructor {
  new (): CormoTypesText;
  (): CormoTypesText;
}

const CormoTypesText: CormoTypesTextConstructor = function (this: CormoTypesText): void {
  if (!(this instanceof CormoTypesText)) {
    return new (CormoTypesText as any)();
  }
  this.toString = () => 'text';
} as CormoTypesTextConstructor;

/**
 * Represents a blob, used in model schemas.
 * @namespace types
 * @class Blob
 */
export interface CormoTypesBlob {
  _type: 'blob';
}

export interface CormoTypesBlobConstructor {
  new (): CormoTypesBlob;
  (): CormoTypesBlob;
}

const CormoTypesBlob: CormoTypesBlobConstructor = function (this: CormoTypesBlob): void {
  if (!(this instanceof CormoTypesBlob)) {
    return new (CormoTypesBlob as any)();
  }
  this.toString = () => 'blob';
} as CormoTypesBlobConstructor;

export type ColumnTypeInternal =
  | CormoTypesString
  | CormoTypesNumber
  | CormoTypesBoolean
  | CormoTypesDate
  | CormoTypesObject
  | CormoTypesInteger
  | CormoTypesBigInteger
  | CormoTypesGeoPoint
  | CormoTypesVector
  | CormoTypesRecordID
  | CormoTypesText
  | CormoTypesBlob;

export type ColumnTypeInternalConstructor =
  | CormoTypesStringConstructor
  | CormoTypesNumberConstructor
  | CormoTypesBooleanConstructor
  | CormoTypesDateConstructor
  | CormoTypesObjectConstructor
  | CormoTypesIntegerConstructor
  | CormoTypesBigIntegerConstructor
  | CormoTypesGeoPointConstructor
  | CormoTypesVectorConstructor
  | CormoTypesRecordIDConstructor
  | CormoTypesTextConstructor
  | CormoTypesBlobConstructor;

type ColumnTypeNativeConstructor =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | DateConstructor
  | ObjectConstructor;

type ColumnTypeString =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'object'
  | 'integer'
  | 'biginteger'
  | 'geopoint'
  | 'vector'
  | 'recordid'
  | 'text'
  | 'blob';

export type ColumnType =
  | ColumnTypeInternal
  | ColumnTypeInternalConstructor
  | ColumnTypeNativeConstructor
  | ColumnTypeString;

/**
 * Converts JavaScript built-in class to CORMO type
 * @private
 */
function _toCORMOType(type: ColumnType): ColumnTypeInternal {
  if (typeof type === 'string') {
    const type_string = type.toLowerCase();
    if (/^string\((\d+)\)$/.test(type_string)) {
      return new CormoTypesString(Number(RegExp.$1));
    }
    switch (type_string) {
      case 'string':
        return new CormoTypesString();
      case 'number':
        return new CormoTypesNumber();
      case 'boolean':
        return new CormoTypesBoolean();
      case 'integer':
        return new CormoTypesInteger();
      case 'biginteger':
        return new CormoTypesBigInteger();
      case 'geopoint':
        return new CormoTypesGeoPoint();
      case 'vector':
        return new CormoTypesVector();
      case 'date':
        return new CormoTypesDate();
      case 'object':
        return new CormoTypesObject();
      case 'recordid':
        return new CormoTypesRecordID();
      case 'text':
        return new CormoTypesText();
      case 'blob':
        return new CormoTypesBlob();
    }
    throw new Error(`unknown type: ${type}`);
  } else if (type === String) {
    return new CormoTypesString();
  } else if (type === Number) {
    return new CormoTypesNumber();
  } else if (type === Boolean) {
    return new CormoTypesBoolean();
  } else if (type === Date) {
    return new CormoTypesDate();
  } else if (type === Object) {
    return new CormoTypesObject();
  }
  if (typeof type === 'function') {
    return new (type as new () => ColumnTypeInternal)();
  }
  return type;
}

export {
  CormoTypesString as String,
  CormoTypesNumber as Number,
  CormoTypesBoolean as Boolean,
  CormoTypesInteger as Integer,
  CormoTypesBigInteger as BigInteger,
  CormoTypesGeoPoint as GeoPoint,
  CormoTypesVector as Vector,
  CormoTypesDate as Date,
  CormoTypesObject as Object,
  CormoTypesRecordID as RecordID,
  CormoTypesText as Text,
  CormoTypesBlob as Blob,
  _toCORMOType,
};

/**
 * A pseudo type represents a record's unique identifier.
 *
 * Its real type differs by adapters.
 *
 * * String for MongoDB
 * * Integer for MySQL, SQLite3, PostegreSQL
 * @namespace ptypes
 */
export type RecordID = string | number;

/**
 * A pseudo type represents an integer
 * @namespace ptypes
 */
export type Integer = number;

/**
 * A pseudo type represents an big integer
 * @namespace ptypes
 */
export type BigInteger = number;

/**
 * A pseudo type represents a two - dimensional point
 * @namespace ptypes
 */
export type GeoPoint = [number, number];
