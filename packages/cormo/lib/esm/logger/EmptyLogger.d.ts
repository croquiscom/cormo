import { Logger } from './Logger.js';
export declare class EmptyLogger implements Logger {
    logQuery(_text: string, _values?: any[]): void;
}
