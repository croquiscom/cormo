"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdapter = createAdapter;
const sqlite3_1 = require("./sqlite3");
function createAdapter(connection) {
    const adapter = (0, sqlite3_1.createAdapter)(connection);
    const _super_connect = adapter.connect;
    adapter.connect = async function () {
        await _super_connect.call(this, {
            database: ':memory:',
        });
    };
    return adapter;
}
