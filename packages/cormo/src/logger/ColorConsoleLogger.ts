import chalk from 'chalk';
import { Logger } from './Logger';

export class ColorConsoleLogger implements Logger {
  public logQuery(text: string, values?: any[]): void {
    console.log('  ', chalk.blue.bold(text), values);
  }
}
