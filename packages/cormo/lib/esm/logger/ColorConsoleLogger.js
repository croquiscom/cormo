import chalk from 'chalk';
export class ColorConsoleLogger {
    logQuery(text, values) {
        console.log('  ', chalk.blue.bold(text), values);
    }
}
