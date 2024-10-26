import path from 'path';

export default class CommandVersion {
  run() {
    const pkg = require(path.resolve(__dirname, '..', '..', 'package.json'));
    console.log(`CORMO version ${pkg.version}, cwd=${process.cwd()}`);
  }
}
