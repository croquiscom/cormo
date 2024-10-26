"use strict";
/**
 * CORMO module
 * @module cormo
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = exports.IsolationLevel = exports.types = exports.Query = exports.Command = exports.BaseModel = exports.SQLite3Connection = exports.PostgreSQLConnection = exports.MySQLConnection = exports.MongoDBConnection = exports.Connection = void 0;
/**
 * Exports [[#Connection]] class
 * @memberOf cormo
 */
var index_js_1 = require("./connection/index.js");
Object.defineProperty(exports, "Connection", { enumerable: true, get: function () { return index_js_1.Connection; } });
Object.defineProperty(exports, "MongoDBConnection", { enumerable: true, get: function () { return index_js_1.MongoDBConnection; } });
Object.defineProperty(exports, "MySQLConnection", { enumerable: true, get: function () { return index_js_1.MySQLConnection; } });
Object.defineProperty(exports, "PostgreSQLConnection", { enumerable: true, get: function () { return index_js_1.PostgreSQLConnection; } });
Object.defineProperty(exports, "SQLite3Connection", { enumerable: true, get: function () { return index_js_1.SQLite3Connection; } });
/**
 * Exports [[#BaseModel]] class
 * @memberOf cormo
 */
var index_js_2 = require("./model/index.js");
Object.defineProperty(exports, "BaseModel", { enumerable: true, get: function () { return index_js_2.BaseModel; } });
/**
 * Exports [[#Command]] class
 * @memberOf cormo
 */
var index_js_3 = require("./command/index.js");
Object.defineProperty(exports, "Command", { enumerable: true, get: function () { return index_js_3.Command; } });
var query_js_1 = require("./query.js");
Object.defineProperty(exports, "Query", { enumerable: true, get: function () { return query_js_1.Query; } });
__exportStar(require("./decorators.js"), exports);
/**
 * Exports [[#types]] module
 * @memberOf cormo
 */
const types = __importStar(require("./types.js"));
exports.types = types;
var transaction_js_1 = require("./transaction.js");
Object.defineProperty(exports, "IsolationLevel", { enumerable: true, get: function () { return transaction_js_1.IsolationLevel; } });
Object.defineProperty(exports, "Transaction", { enumerable: true, get: function () { return transaction_js_1.Transaction; } });
__exportStar(require("./logger/index.js"), exports);
__exportStar(require("./adapters/index.js"), exports);
