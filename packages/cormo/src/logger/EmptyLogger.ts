import { ILogger } from './ILogger';

export class EmptyLogger implements ILogger {
  public logQuery(text: string, values?: any[]): void {
    //
  }
}
