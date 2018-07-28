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
// tslint:disable-next-line:max-line-length
export function getLeafOfPath(obj: object, path: string | string[], create_object = true): [object | undefined, string | undefined] {
  const parts = Array.isArray(path) ? path.slice(0) : path.split('.');
  const last = parts.pop();
  if (parts.length > 0) {
    if (create_object !== false) {
      for (const part of parts) {
        obj = (obj as any)[part] || ((obj as any)[part] = {});
      }
    } else {
      for (const part of parts) {
        obj = (obj as any)[part];
        if (!obj) {
          return [undefined, undefined];
        }
      }
    }
  }
  return [obj, last];
}

/**
 * Gets a value of object by path
 * @memberOf util
 */
export function getPropertyOfPath(obj: object, path: string | string[]): any {
  const [child, last] = getLeafOfPath(obj, path, false);
  return child && last ? (child as any)[last] : undefined;
}

/**
 * Sets a value to object by path
 * @memberOf util
 * @param {Object} obj
 * @param {String|Array<String>} path
 * @param {*} value
 */
export function setPropertyOfPath(obj: object, path: string | string[], value: any) {
  const [child, last] = getLeafOfPath(obj, path);
  if (child && last) {
    (child as any)[last] = value;
  }
}
