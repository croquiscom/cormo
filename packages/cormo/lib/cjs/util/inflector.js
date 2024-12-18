"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.foreign_key = foreign_key;
exports.pluralize = pluralize;
exports.singularize = singularize;
exports.tableize = tableize;
exports.classify = classify;
exports.underscore = underscore;
exports.camelize = camelize;
/**
 * Inflectors
 * @module inflector
 * @namespace cormo
 */
const inflected = __importStar(require("inflected"));
/**
 * Returns foreign_key for a name
 * @memberOf inflector
 */
function foreign_key(name) {
    return underscore(name) + '_id';
}
/**
 * Returns pluralized string of a string
 * @memberOf inflector
 */
function pluralize(str) {
    return inflected.pluralize(str);
}
/**
 * Returns singularized string of a string
 * @memberOf inflector
 */
function singularize(str) {
    return inflected.singularize(str);
}
/**
 * Returns table name of a name
 * @memberOf inflector
 */
function tableize(name) {
    return pluralize(underscore(name));
}
/**
 * Returns class name of a name
 * @memberOf inflector
 */
function classify(name) {
    return camelize(singularize(name));
}
/**
 * Returns underscored string of a string
 * @memberOf inflector
 */
function underscore(str) {
    return inflected.underscore(str);
}
/**
 * Returns camelized string of a string
 * @memberOf inflector
 */
function camelize(str) {
    return inflected.camelize(str);
}
