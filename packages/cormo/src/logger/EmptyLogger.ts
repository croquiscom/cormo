import { Logger } from './Logger.js';

export class EmptyLogger implements Logger {
  public logQuery(_text: string, _values?: any[]): void {
    //
  }
}
