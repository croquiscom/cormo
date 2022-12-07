import { Logger } from './Logger';

export class EmptyLogger implements Logger {
  public logQuery(_text: string, _values?: any[]): void {
    //
  }
}
