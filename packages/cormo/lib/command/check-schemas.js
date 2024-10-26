"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const yargs_1 = __importDefault(require("yargs"));
class CommandCheckSchemas {
    constructor(argv) {
        const args = yargs_1.default
            .option('r', {
            array: true,
            description: 'preload the given module',
            string: true,
        })
            .alias('r', 'require')
            .help('help')
            .alias('h', 'help')
            .parseSync(argv);
        this.modules_to_load = args.require ?? [];
    }
    async run() {
        let has_changes = false;
        for (const module_to_load of this.modules_to_load) {
            try {
                const loaded = require(path_1.default.resolve(process.cwd(), module_to_load));
                for (const obj in loaded) {
                    if (typeof loaded[obj].getSchemaChanges === 'function') {
                        const changes = await loaded[obj].getSchemaChanges();
                        if (Array.isArray(changes)) {
                            for (const change of changes) {
                                if (!change.ignorable) {
                                    has_changes = true;
                                }
                                console.log(`${change.message}${change.ignorable ? ' (ignorable)' : ''}`);
                            }
                        }
                    }
                }
            }
            catch (error1) {
                if (error1.code === 'MODULE_NOT_FOUND') {
                    try {
                        require(path_1.default.resolve(process.cwd(), 'node_modules', module_to_load));
                    }
                    catch (error2) {
                        console.log(error2.toString());
                    }
                }
                else {
                    console.log(error1.toString());
                }
            }
        }
        if (has_changes) {
            process.exit(1);
        }
        else {
            process.exit(0);
        }
    }
}
exports.default = CommandCheckSchemas;
