import { Logger } from './Logger';
export declare class EmptyLogger implements Logger {
    logQuery(text: string, values?: any[]): void;
}
