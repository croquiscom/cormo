import { dynamicImport } from 'tsimportlib';
import { Logger } from './Logger';

let chalk: typeof import('chalk').default | undefined;

export class ColorConsoleLogger implements Logger {
  public logQuery(text: string, values?: any[]): void {
    if (chalk) {
      console.log('  ', chalk.blue.bold(text), values);
    }
  }
}

(async () => {
  chalk = (await dynamicImport('chalk', module)).default;
})();
