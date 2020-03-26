import { Logger } from './Logger';

export class EmptyLogger implements Logger {
  public logQuery(text: string, values?: any[]): void {
    //
  }
}
