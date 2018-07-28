/**
 * Utilities
 * @module util
 * @namespace cormo
 */
/**
 * Returns leaf object and last part.
 *
 * e.g.) (obj, 'a.b.c') -> [ obj.a.b, 'c' ]
 * @memberOf util
 */
export declare function getLeafOfPath(obj: object, path: string | string[], create_object?: boolean): [object | undefined, string | undefined];
/**
 * Gets a value of object by path
 * @memberOf util
 */
export declare function getPropertyOfPath(obj: object, path: string | string[]): any;
/**
 * Sets a value to object by path
 * @memberOf util
 * @param {Object} obj
 * @param {String|Array<String>} path
 * @param {*} value
 */
export declare function setPropertyOfPath(obj: object, path: string | string[], value: any): void;
