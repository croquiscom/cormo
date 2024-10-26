/**
 * Inflectors
 * @module inflector
 * @namespace cormo
 */
import * as inflected from 'inflected';
/**
 * Returns foreign_key for a name
 * @memberOf inflector
 */
export function foreign_key(name) {
    return underscore(name) + '_id';
}
/**
 * Returns pluralized string of a string
 * @memberOf inflector
 */
export function pluralize(str) {
    return inflected.pluralize(str);
}
/**
 * Returns singularized string of a string
 * @memberOf inflector
 */
export function singularize(str) {
    return inflected.singularize(str);
}
/**
 * Returns table name of a name
 * @memberOf inflector
 */
export function tableize(name) {
    return pluralize(underscore(name));
}
/**
 * Returns class name of a name
 * @memberOf inflector
 */
export function classify(name) {
    return camelize(singularize(name));
}
/**
 * Returns underscored string of a string
 * @memberOf inflector
 */
export function underscore(str) {
    return inflected.underscore(str);
}
/**
 * Returns camelized string of a string
 * @memberOf inflector
 */
export function camelize(str) {
    return inflected.camelize(str);
}
