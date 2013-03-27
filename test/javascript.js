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
      _g.connection = new _g.Connection(db, _dbs[db]);

      var User = _g.connection.model('User', { name: String, age: Number });

      _g.dropModels([User], done);
    });

    beforeEach(function (done) {
      _g.deleteAllRecords([_g.connection.User], done);
    });

    after(function (done) {
      _g.dropModels([_g.connection.User], done);
    });

    require('./cases/javascript')();
  });
});
