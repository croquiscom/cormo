import { ILogger } from './ILogger';
export declare class EmptyLogger implements ILogger {
    logQuery(text: string, values?: any[]): void;
}
