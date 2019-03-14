"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3_1 = require("./sqlite3");
function createAdapter(connection) {
    const adapter = sqlite3_1.createAdapter(connection);
    const _super_connect = adapter.connect;
    adapter.connect = async function () {
        await _super_connect.call(this, {
            database: ':memory:',
        });
    };
    return adapter;
}
exports.createAdapter = createAdapter;
