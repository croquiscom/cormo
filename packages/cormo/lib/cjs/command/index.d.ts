/**
 * Supports command line interface
 * @static
 */
declare class Command {
    /**
     * Runs a command
     */
    static run(argv: string[]): Promise<any>;
}
export { Command };
