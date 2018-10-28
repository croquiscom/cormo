// tslint:disable:max-classes-per-file
// tslint:disable:variable-name

/**
 * CORMO types
 * @module types
 * @namespace cormo
 */

export type ColumnTypeInternal = ICormoTypesString | ICormoTypesNumber | ICormoTypesBoolean | ICormoTypesDate
  | ICormoTypesObject | ICormoTypesInteger | ICormoTypesGeoPoint | ICormoTypesRecordID | ICormoTypesText;

type ColumnTypeConstructor = ICormoTypesStringConstructor | StringConstructor
  | ICormoTypesNumberConstructor | NumberConstructor
  | ICormoTypesBooleanConstructor | BooleanConstructor
  | ICormoTypesDateConstructor | DateConstructor
  | ICormoTypesObjectConstructor | ObjectConstructor
  | ICormoTypesIntegerConstructor | ICormoTypesGeoPointConstructor
  | ICormoTypesRecordIDConstructor | ICormoTypesTextConstructor;

type ColumnTypeString = 'string' | 'number' | 'boolean' | 'date'
  | 'object' | 'integer' | 'geopoint' | 'recordid' | 'text';

export type ColumnType = ColumnTypeInternal | ColumnTypeConstructor | ColumnTypeString;

/**
 * Represents a string, used in model schemas.
 * @memberOf types
 */
interface ICormoTypesString {
  _type: 'string';
  length?: number;
}

interface ICormoTypesStringConstructor {
  new(length?: number): ICormoTypesString;
  (length?: number): ICormoTypesString;
}

const CormoTypesString: ICormoTypesStringConstructor = function(this: ICormoTypesString, length?: number): void {
  if (!(this instanceof CormoTypesString)) {
    return new (CormoTypesString as any)(length);
  }
  this.length = length;
} as ICormoTypesStringConstructor;

/**
 * Represents a double-precision floating-point, used in model schemas.
 * @memberOf types
 */
interface ICormoTypesNumber {
  _type: 'number';
}

interface ICormoTypesNumberConstructor {
  new(): ICormoTypesNumber;
  (): ICormoTypesNumber;
}

const CormoTypesNumber: ICormoTypesNumberConstructor = function(this: ICormoTypesNumber): void {
  if (!(this instanceof CormoTypesNumber)) {
    return new (CormoTypesNumber as any)();
  }
} as ICormoTypesNumberConstructor;

/**
 * Represents a boolean, used in model schemas.
 * @memberOf types
 */
interface ICormoTypesBoolean {
  _type: 'boolean';
}

interface ICormoTypesBooleanConstructor {
  new(): ICormoTypesBoolean;
  (): ICormoTypesBoolean;
}

// tslint:disable-next-line:variable-name
const CormoTypesBoolean: ICormoTypesBooleanConstructor = function(this: ICormoTypesBoolean): void {
  if (!(this instanceof CormoTypesBoolean)) {
    return new (CormoTypesBoolean as any)();
  }
} as ICormoTypesBooleanConstructor;

/**
 * Represents a 32bit integer, used in model schemas.
 * @memberOf types
 */
interface ICormoTypesInteger {
  _type: 'integer';
}

interface ICormoTypesIntegerConstructor {
  new(): ICormoTypesInteger;
  (): ICormoTypesInteger;
}

// tslint:disable-next-line:variable-name
const CormoTypesInteger: ICormoTypesIntegerConstructor = function(this: ICormoTypesInteger): void {
  if (!(this instanceof CormoTypesInteger)) {
    return new (CormoTypesInteger as any)();
  }
} as ICormoTypesIntegerConstructor;

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
  new(): ICormoTypesGeoPoint;
  (): ICormoTypesGeoPoint;
}

// tslint:disable-next-line:variable-name
const CormoTypesGeoPoint: ICormoTypesGeoPointConstructor = function(this: ICormoTypesGeoPoint): void {
  if (!(this instanceof CormoTypesGeoPoint)) {
    return new (CormoTypesGeoPoint as any)();
  }
} as ICormoTypesGeoPointConstructor;

/**
 * Represents a date, used in model schemas.
 * @memberOf types
 */
interface ICormoTypesDate {
  _type: 'date';
}

interface ICormoTypesDateConstructor {
  new(): ICormoTypesDate;
  (): ICormoTypesDate;
}

// tslint:disable-next-line:variable-name
const CormoTypesDate: ICormoTypesDateConstructor = function(this: ICormoTypesDate): void {
  if (!(this instanceof CormoTypesDate)) {
    return new (CormoTypesDate as any)();
  }
} as ICormoTypesDateConstructor;

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
  new(): ICormoTypesObject;
  (): ICormoTypesObject;
}

// tslint:disable-next-line:variable-name
const CormoTypesObject: ICormoTypesObjectConstructor = function(this: ICormoTypesObject): void {
  if (!(this instanceof CormoTypesObject)) {
    return new (CormoTypesObject as any)();
  }
} as ICormoTypesObjectConstructor;

/**
 * Represents a record id, used in model schemas.
 * @memberOf types
 */
interface ICormoTypesRecordID {
  _type: 'recordid';
}

interface ICormoTypesRecordIDConstructor {
  new(): ICormoTypesRecordID;
  (): ICormoTypesRecordID;
}

// tslint:disable-next-line:variable-name
const CormoTypesRecordID: ICormoTypesRecordIDConstructor = function(this: ICormoTypesRecordID): void {
  if (!(this instanceof CormoTypesRecordID)) {
    return new (CormoTypesRecordID as any)();
  }
} as ICormoTypesRecordIDConstructor;

/**
 * Represents a text, used in model schemas.
 * @memberOf types
 */
interface ICormoTypesText {
  _type: 'text';
}

interface ICormoTypesTextConstructor {
  new(): ICormoTypesText;
  (): ICormoTypesText;
}

// tslint:disable-next-line:variable-name
const CormoTypesText: ICormoTypesTextConstructor = function(this: ICormoTypesText): void {
  if (!(this instanceof CormoTypesText)) {
    return new (CormoTypesText as any)();
  }
} as ICormoTypesTextConstructor;

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
      case 'geopoint':
        return new CormoTypesGeoPoint();
      case 'date':
        return new CormoTypesDate();
      case 'object':
        return new CormoTypesObject();
      case 'recordid':
        return new CormoTypesRecordID();
      case 'text':
        return new CormoTypesText();
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
  CormoTypesGeoPoint as GeoPoint,
  CormoTypesDate as Date,
  CormoTypesObject as Object,
  CormoTypesRecordID as RecordID,
  CormoTypesText as Text,
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
 * A pseudo type represents a two - dimensional point
 * @namespace ptypes
 */
export type GeoPoint = [number, number];
