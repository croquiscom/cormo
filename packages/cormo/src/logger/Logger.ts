export interface Logger {
  logQuery(text: string, values?: any[]): void;
}
