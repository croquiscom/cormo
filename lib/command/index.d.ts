/**
 * Supports command line interface
 * @static
 */
declare class Command {
    /**
     * Runs a command
     * @param {Array<String>} argv
     */
    static run(argv: string[]): any;
}
export { Command };
