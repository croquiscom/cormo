"use strict";
/**
 * CORMO module
 * @module cormo
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Exports [[#Connection]] class
 * @memberOf cormo
 */
var connection_1 = require("./connection");
exports.Connection = connection_1.Connection;
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
const types = require("./types");
exports.types = types;
