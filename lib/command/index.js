"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
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
            // tslint:disable-next-line:variable-name
            const CommandClass = require(path.resolve(__dirname, '..', 'command', command));
            const runner = new CommandClass(argv);
            return runner.run();
        }
        catch (error) {
            console.log(`Cannot find a CORMO command ${command}`);
        }
    }
}
exports.Command = Command;
