import path from 'path';

/**
 * Supports command line interface
 * @static
 */
class Command {
  /**
   * Runs a command
   */
  public static run(argv: string[]) {
    const command = argv[2];
    if (!command) {
      console.log('Usage: cormo <command>');
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const CommandClass = require(path.resolve(__dirname, '..', 'command', command));
      const runner = new CommandClass(argv);
      return runner.run();
    } catch (error) {
      console.log(`Cannot find a CORMO command ${command}`);
    }
  }
}

export { Command };
