"use strict";
/**
 * CORMO types
 * @module types
 * @namespace cormo
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports._toCORMOType = exports.Blob = exports.Text = exports.RecordID = exports.Object = exports.Date = exports.GeoPoint = exports.BigInteger = exports.Integer = exports.Boolean = exports.Number = exports.String = void 0;
const CormoTypesString = function (length) {
    if (!(this instanceof CormoTypesString)) {
        return new CormoTypesString(length);
    }
    this.length = length;
    this.toString = () => (this.length ? `string(${this.length})` : 'string');
};
exports.String = CormoTypesString;
const CormoTypesNumber = function () {
    if (!(this instanceof CormoTypesNumber)) {
        return new CormoTypesNumber();
    }
    this.toString = () => 'number';
};
exports.Number = CormoTypesNumber;
const CormoTypesBoolean = function () {
    if (!(this instanceof CormoTypesBoolean)) {
        return new CormoTypesBoolean();
    }
    this.toString = () => 'boolean';
};
exports.Boolean = CormoTypesBoolean;
const CormoTypesInteger = function () {
    if (!(this instanceof CormoTypesInteger)) {
        return new CormoTypesInteger();
    }
    this.toString = () => 'integer';
};
exports.Integer = CormoTypesInteger;
const CormoTypesBigInteger = function () {
    if (!(this instanceof CormoTypesBigInteger)) {
        return new CormoTypesBigInteger();
    }
    this.toString = () => 'biginteger';
};
exports.BigInteger = CormoTypesBigInteger;
const CormoTypesGeoPoint = function () {
    if (!(this instanceof CormoTypesGeoPoint)) {
        return new CormoTypesGeoPoint();
    }
    this.toString = () => 'geopoint';
};
exports.GeoPoint = CormoTypesGeoPoint;
const CormoTypesDate = function () {
    if (!(this instanceof CormoTypesDate)) {
        return new CormoTypesDate();
    }
    this.toString = () => 'date';
};
exports.Date = CormoTypesDate;
const CormoTypesObject = function () {
    if (!(this instanceof CormoTypesObject)) {
        return new CormoTypesObject();
    }
    this.toString = () => 'object';
};
exports.Object = CormoTypesObject;
const CormoTypesRecordID = function () {
    if (!(this instanceof CormoTypesRecordID)) {
        return new CormoTypesRecordID();
    }
    this.toString = () => 'recordid';
};
exports.RecordID = CormoTypesRecordID;
const CormoTypesText = function () {
    if (!(this instanceof CormoTypesText)) {
        return new CormoTypesText();
    }
    this.toString = () => 'text';
};
exports.Text = CormoTypesText;
const CormoTypesBlob = function () {
    if (!(this instanceof CormoTypesBlob)) {
        return new CormoTypesBlob();
    }
    this.toString = () => 'blob';
};
exports.Blob = CormoTypesBlob;
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
exports._toCORMOType = _toCORMOType;
