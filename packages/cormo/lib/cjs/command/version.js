"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
class CommandVersion {
    run() {
        const pkg = require(path_1.default.resolve(__dirname, '..', '..', 'package.json'));
        console.log(`CORMO version ${pkg.version}, cwd=${process.cwd()}`);
    }
}
exports.default = CommandVersion;
