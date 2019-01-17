export interface ILogger {
    logQuery(text: string, values?: any[]): void;
}
