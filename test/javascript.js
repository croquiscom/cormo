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
    before(function (done) {
      global.connection = new Connection(db, _dbs[db]);

      var User = connection.model('User', { name: String, age: Number });

      dropModels([User], done);
    });

    beforeEach(function (done) {
      deleteAllRecords([connection.User], done);
    });

    after(function (done) {
      dropModels([connection.User], done);
    });

    require('./cases/javascript')();
  });
});
