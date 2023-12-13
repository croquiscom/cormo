"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorConsoleLogger = void 0;
const tsimportlib_1 = require("tsimportlib");
let chalk;
class ColorConsoleLogger {
    logQuery(text, values) {
        if (chalk) {
            console.log('  ', chalk.blue.bold(text), values);
        }
    }
}
exports.ColorConsoleLogger = ColorConsoleLogger;
(async () => {
    chalk = (await (0, tsimportlib_1.dynamicImport)('chalk', module)).default;
})();
