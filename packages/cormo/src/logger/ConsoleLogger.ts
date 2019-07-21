import { ILogger } from './ILogger';

export class ConsoleLogger implements ILogger {
  public logQuery(text: string, values?: any[]): void {
    console.log(text, values);
  }
}
