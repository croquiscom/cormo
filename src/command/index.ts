import * as path from 'path';

/**
 * Supports command line interface
 * @static
 */
class Command {
  /**
   * Runs a command
   * @param {Array<String>} argv
   */
  public static run(argv: string[]) {
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
    } catch (error) {
      console.log(`Cannot find a CORMO command ${command}`);
    }
  }
}

export { Command };
