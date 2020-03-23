import path from 'path';

export default class CommandVersion {
  run() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require(path.resolve(__dirname, '..', '..', 'package.json'));
    console.log(`CORMO version ${pkg.version}, cwd=${process.cwd()}`);
  }
}
