/**
 * CORMO types
 * @module types
 * @namespace cormo
 */
const CormoTypesString = function (length) {
    if (!(this instanceof CormoTypesString)) {
        return new CormoTypesString(length);
    }
    this.length = length;
    this.toString = () => (this.length ? `string(${this.length})` : 'string');
};
const CormoTypesNumber = function () {
    if (!(this instanceof CormoTypesNumber)) {
        return new CormoTypesNumber();
    }
    this.toString = () => 'number';
};
const CormoTypesBoolean = function () {
    if (!(this instanceof CormoTypesBoolean)) {
        return new CormoTypesBoolean();
    }
    this.toString = () => 'boolean';
};
const CormoTypesInteger = function () {
    if (!(this instanceof CormoTypesInteger)) {
        return new CormoTypesInteger();
    }
    this.toString = () => 'integer';
};
const CormoTypesBigInteger = function () {
    if (!(this instanceof CormoTypesBigInteger)) {
        return new CormoTypesBigInteger();
    }
    this.toString = () => 'biginteger';
};
const CormoTypesGeoPoint = function () {
    if (!(this instanceof CormoTypesGeoPoint)) {
        return new CormoTypesGeoPoint();
    }
    this.toString = () => 'geopoint';
};
const CormoTypesVector = function (dimension) {
    if (!(this instanceof CormoTypesVector)) {
        return new CormoTypesVector(dimension);
    }
    this.dimension = dimension;
    this.toString = () => (this.dimension ? `vector(${this.dimension})` : 'vector');
};
const CormoTypesDate = function () {
    if (!(this instanceof CormoTypesDate)) {
        return new CormoTypesDate();
    }
    this.toString = () => 'date';
};
const CormoTypesObject = function () {
    if (!(this instanceof CormoTypesObject)) {
        return new CormoTypesObject();
    }
    this.toString = () => 'object';
};
const CormoTypesRecordID = function () {
    if (!(this instanceof CormoTypesRecordID)) {
        return new CormoTypesRecordID();
    }
    this.toString = () => 'recordid';
};
const CormoTypesText = function () {
    if (!(this instanceof CormoTypesText)) {
        return new CormoTypesText();
    }
    this.toString = () => 'text';
};
const CormoTypesBlob = function () {
    if (!(this instanceof CormoTypesBlob)) {
        return new CormoTypesBlob();
    }
    this.toString = () => 'blob';
};
/**
 * Converts JavaScript built-in class to CORMO type
 * @private
 */
function _toCORMOType(type) {
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
    }
    else if (type === String) {
        return new CormoTypesString();
    }
    else if (type === Number) {
        return new CormoTypesNumber();
    }
    else if (type === Boolean) {
        return new CormoTypesBoolean();
    }
    else if (type === Date) {
        return new CormoTypesDate();
    }
    else if (type === Object) {
        return new CormoTypesObject();
    }
    if (typeof type === 'function') {
        return new type();
    }
    return type;
}
export { CormoTypesString as String, CormoTypesNumber as Number, CormoTypesBoolean as Boolean, CormoTypesInteger as Integer, CormoTypesBigInteger as BigInteger, CormoTypesGeoPoint as GeoPoint, CormoTypesVector as Vector, CormoTypesDate as Date, CormoTypesObject as Object, CormoTypesRecordID as RecordID, CormoTypesText as Text, CormoTypesBlob as Blob, _toCORMOType, };
