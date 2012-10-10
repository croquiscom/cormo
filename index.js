exports.DBConnection = process.env.TEST_COV
  ? require('./lib-cov/connection')
  : require('./lib/connection')

types = require('./lib/types');
for (type in types) {
  exports[type] = types[type]
}
