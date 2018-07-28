"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Inflectors
 * @module inflector
 * @namespace cormo
 */
const inflected = require("inflected");
/**
 * Returns foreign_key for a name
 * @memberOf inflector
 */
function foreign_key(name) {
    return underscore(name) + '_id';
}
exports.foreign_key = foreign_key;
/**
 * Returns pluralized string of a string
 * @memberOf inflector
 */
function pluralize(str) {
    return inflected.pluralize(str);
}
exports.pluralize = pluralize;
/**
 * Returns singularized string of a string
 * @memberOf inflector
 */
function singularize(str) {
    return inflected.singularize(str);
}
exports.singularize = singularize;
/**
 * Returns table name of a name
 * @memberOf inflector
 */
function tableize(name) {
    return pluralize(underscore(name));
}
exports.tableize = tableize;
/**
 * Returns class name of a name
 * @memberOf inflector
 */
function classify(name) {
    return camelize(singularize(name));
}
exports.classify = classify;
/**
 * Returns underscored string of a string
 * @memberOf inflector
 */
function underscore(str) {
    return inflected.underscore(str);
}
exports.underscore = underscore;
/**
 * Returns camelized string of a string
 * @memberOf inflector
 */
function camelize(str) {
    return inflected.camelize(str);
}
exports.camelize = camelize;
