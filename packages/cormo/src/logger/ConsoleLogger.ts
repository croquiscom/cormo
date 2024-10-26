import { Logger } from './Logger.js';

export class ConsoleLogger implements Logger {
  public logQuery(text: string, values?: any[]): void {
    console.log(text, values);
  }
}
