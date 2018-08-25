"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3_1 = require("./sqlite3");
exports.default = (connection) => {
    const adapter = sqlite3_1.default(connection);
    const _super_connect = adapter.connect;
    adapter.connect = function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield _super_connect.call(this, {
                database: ':memory:',
            });
        });
    };
    return adapter;
};
