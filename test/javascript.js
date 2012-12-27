require('./common');

_dbs = {
  mysql: { database: 'test' },
  mongodb: { database: 'test' },
  sqlite3: { database: __dirname + '/test.sqlite3' },
  sqlite3_memory: {},
  postgresql: { database: 'test' }
};
Object.keys(_dbs).forEach(function (db) {
  describe('javascript-' + db, function () {
    var connection = new Connection(db, _dbs[db]);
    var models = {}

    before(function (done) {
      models.User = connection.model('User', { name: String, age: Number });

      dropModels([models.User], done);
    });

    beforeEach(function (done) {
      deleteAllRecords([models.User], done);
    });

    after(function (done) {
      dropModels([models.User], done);
    });

    require('./cases/javascript')(models);
  });
});
