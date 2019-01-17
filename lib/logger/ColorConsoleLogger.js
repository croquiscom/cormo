"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = require("chalk");
class ColorConsoleLogger {
    logQuery(text, values) {
        console.log('  ', chalk_1.default.blue.bold(text), values);
    }
}
exports.ColorConsoleLogger = ColorConsoleLogger;
