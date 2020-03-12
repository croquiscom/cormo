"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
/**
 * Supports command line interface
 * @static
 */
class Command {
    /**
     * Runs a command
     */
    static run(argv) {
        const command = argv[2];
        if (!command) {
            console.log('Usage: cormo <command>');
            return;
        }
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const CommandClass = require(path_1.default.resolve(__dirname, '..', 'command', command));
            const runner = new CommandClass(argv);
            return runner.run();
        }
        catch (error) {
            console.log(`Cannot find a CORMO command ${command}`);
        }
    }
}
exports.Command = Command;
