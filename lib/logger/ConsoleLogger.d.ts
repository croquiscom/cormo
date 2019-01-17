import { ILogger } from './ILogger';
export declare class ConsoleLogger implements ILogger {
    logQuery(text: string, values?: any[]): void;
}
