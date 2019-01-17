import { ILogger } from './ILogger';
export declare class ColorConsoleLogger implements ILogger {
    logQuery(text: string, values?: any[]): void;
}
