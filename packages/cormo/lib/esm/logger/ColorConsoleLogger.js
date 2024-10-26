let chalk;
import('chalk')
    .then((m) => {
    chalk = m.default;
})
    .catch(() => {
    //
});
export class ColorConsoleLogger {
    logQuery(text, values) {
        if (chalk) {
            console.log('  ', chalk.blue.bold(text), values);
        }
        else {
            console.log(text, values);
        }
    }
}
