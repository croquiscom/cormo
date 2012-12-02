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
    var connection = undefined;
    var connect = function (callback) {
      connection = new Connection(db, _dbs[db]);
      if (connection.connected) {
        callback();
      } else {
        connection.once('connected', callback);
        connection.once('error', function (error) {
          callback(error);
        });
      }
    };

    var models = {}

    before(function (done) {
      connect(function (error) {
        if (error) {
          return done(error);
        }

        var User = models.User = connection.model('User', { name: String, age: Number });

        User.drop(function (error) {
          if (error) {
            return done(error);
          }
          done(null);
        });
      });
    });

    beforeEach(function (done) {
      models.User.deleteAll(function (error) {
        if (error) {
          return done(error);
        }
        done(null);
      });
    });

    after(function (done) {
      models.User.drop(done);
    });

    require('./cases/javascript')(models);
  });
});
