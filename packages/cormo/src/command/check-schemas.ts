import path from 'path';
import yargs from 'yargs';

export default class CommandCheckSchemas {
  private modules_to_load: string[];

  constructor(argv: string[]) {
    const args = yargs
      .option('r', {
        array: true,
        description: 'preload the given module',
        string: true,
      })
      .alias('r', 'require')
      .help('help')
      .alias('h', 'help')
      .parse(argv);
    this.modules_to_load = args.require ?? [];
  }

  async run() {
    let has_changes = false;
    for (const module_to_load of this.modules_to_load) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const loaded = require(path.resolve(process.cwd(), module_to_load));
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
      } catch (error1) {
        if (error1.code === 'MODULE_NOT_FOUND') {
          try {
            require(path.resolve(process.cwd(), 'node_modules', module_to_load));
          } catch (error2) {
            console.log(error2.toString());
          }
        } else {
          console.log(error1.toString());
        }
      }
    }
    if (has_changes) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}
