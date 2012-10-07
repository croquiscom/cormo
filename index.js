exports.DBConnection = process.env.TEST_COV
  ? require('./lib-cov/connection')
  : require('./lib/connection')
