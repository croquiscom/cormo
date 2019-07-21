import chalk from 'chalk';
import { ILogger } from './ILogger';

export class ColorConsoleLogger implements ILogger {
  public logQuery(text: string, values?: any[]): void {
    console.log('  ', chalk.blue.bold(text), values);
  }
}
