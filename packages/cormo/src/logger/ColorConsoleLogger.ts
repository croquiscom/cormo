import { Logger } from './Logger.js';

let chalk: typeof import('chalk').default | undefined;

import('chalk')
  .then((m) => {
    chalk = m.default;
  })
  .catch(() => {
    //
  });

export class ColorConsoleLogger implements Logger {
  public logQuery(text: string, values?: any[]): void {
    if (chalk) {
      console.log('  ', chalk.blue.bold(text), values);
    } else {
      console.log(text, values);
    }
  }
}
