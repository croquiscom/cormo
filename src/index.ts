/**
 * CORMO module
 * @module cormo
 */

/**
 * Exports [[#Connection]] class
 * @memberOf cormo
 */
export { Connection } from './connection';

//#
// Exports [[#Model]] class
// @memberOf cormo
exports.Model = require('./model');

//#
// Exports [[#Command]] class
// @memberOf cormo
exports.Command = require('./command');

/**
 * Exports [[#types]] module
 * @memberOf cormo
 */
import * as types from './types';
export { types };
