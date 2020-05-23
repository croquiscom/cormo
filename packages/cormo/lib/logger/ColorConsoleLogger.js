"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorConsoleLogger = void 0;
const chalk_1 = __importDefault(require("chalk"));
class ColorConsoleLogger {
    logQuery(text, values) {
        console.log('  ', chalk_1.default.blue.bold(text), values);
    }
}
exports.ColorConsoleLogger = ColorConsoleLogger;
