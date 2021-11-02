import path from 'path';

/**
 * Supports command line interface
 * @static
 */
class Command {
  /**
   * Runs a command
   */
  public static async run(argv: string[]) {
    const command = argv[2];
    if (!command) {
      console.log('Usage: cormo <command>');
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const CommandClass = require(path.resolve(__dirname, command)).default;
      const runner = new CommandClass(argv.slice(3));
      return await runner.run();
    } catch (error: any) {
      console.log(`Cannot find a CORMO command ${command}`);
    }
  }
}

export { Command };
