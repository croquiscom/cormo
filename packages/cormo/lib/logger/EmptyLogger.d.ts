import { Logger } from './Logger';
export declare class EmptyLogger implements Logger {
    logQuery(_text: string, _values?: any[]): void;
}
