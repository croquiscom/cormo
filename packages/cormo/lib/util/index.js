"use strict";
/**
 * Utilities
 * @module util
 * @namespace cormo
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Returns leaf object and last part.
 *
 * e.g.) (obj, 'a.b.c') -> [ obj.a.b, 'c' ]
 * @memberOf util
 */
function getLeafOfPath(obj, path, create_object = true) {
    const parts = Array.isArray(path) ? path.slice(0) : path.split('.');
    const last = parts.pop();
    if (parts.length > 0) {
        if (create_object !== false) {
            for (const part of parts) {
                obj = obj[part] || (obj[part] = {});
            }
        }
        else {
            for (const part of parts) {
                obj = obj[part];
                if (!obj) {
                    return [undefined, undefined];
                }
            }
        }
    }
    return [obj, last];
}
exports.getLeafOfPath = getLeafOfPath;
/**
 * Gets a value of object by path
 * @memberOf util
 */
function getPropertyOfPath(obj, path) {
    const [child, last] = getLeafOfPath(obj, path, false);
    return child && last ? child[last] : undefined;
}
exports.getPropertyOfPath = getPropertyOfPath;
/**
 * Sets a value to object by path
 * @memberOf util
 */
function setPropertyOfPath(obj, path, value) {
    const [child, last] = getLeafOfPath(obj, path);
    if (child && last) {
        child[last] = value;
    }
}
exports.setPropertyOfPath = setPropertyOfPath;
