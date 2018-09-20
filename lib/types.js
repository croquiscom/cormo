"use strict";
// tslint:disable:max-classes-per-file
// tslint:disable:variable-name
Object.defineProperty(exports, "__esModule", { value: true });
const CormoTypesString = function (length) {
    if (!(this instanceof CormoTypesString)) {
        return new CormoTypesString(length);
    }
    this.length = length;
};
exports.String = CormoTypesString;
const CormoTypesNumber = function () {
    if (!(this instanceof CormoTypesNumber)) {
        return new CormoTypesNumber();
    }
};
exports.Number = CormoTypesNumber;
// tslint:disable-next-line:variable-name
const CormoTypesBoolean = function () {
    if (!(this instanceof CormoTypesBoolean)) {
        return new CormoTypesBoolean();
    }
};
exports.Boolean = CormoTypesBoolean;
// tslint:disable-next-line:variable-name
const CormoTypesInteger = function () {
    if (!(this instanceof CormoTypesInteger)) {
        return new CormoTypesInteger();
    }
};
exports.Integer = CormoTypesInteger;
// tslint:disable-next-line:variable-name
const CormoTypesGeoPoint = function () {
    if (!(this instanceof CormoTypesGeoPoint)) {
        return new CormoTypesGeoPoint();
    }
};
exports.GeoPoint = CormoTypesGeoPoint;
// tslint:disable-next-line:variable-name
const CormoTypesDate = function () {
    if (!(this instanceof CormoTypesDate)) {
        return new CormoTypesDate();
    }
};
exports.Date = CormoTypesDate;
// tslint:disable-next-line:variable-name
const CormoTypesObject = function () {
    if (!(this instanceof CormoTypesObject)) {
        return new CormoTypesObject();
    }
};
exports.Object = CormoTypesObject;
// tslint:disable-next-line:variable-name
const CormoTypesRecordID = function () {
    if (!(this instanceof CormoTypesRecordID)) {
        return new CormoTypesRecordID();
    }
};
exports.RecordID = CormoTypesRecordID;
// tslint:disable-next-line:variable-name
const CormoTypesText = function () {
    if (!(this instanceof CormoTypesText)) {
        return new CormoTypesText();
    }
};
exports.Text = CormoTypesText;
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
