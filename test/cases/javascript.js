var _g = require('../support/common');
var expect = require('chai').expect;

_createUsers = function (User, data, callback) {
  if (typeof(data)==='function') {
    callback = data;
    data = [
      { name: 'John Doe', age: 27 },
      { name: 'Bill Smith', age: 45 },
      { name: 'Alice Jackson', age: 27 },
      { name: 'Gina Baker', age: 32 },
      { name: 'Daniel Smith', age: 53 }
    ];
  }
  data.sort(function () { return 0.5 - Math.random(); }); // random sort
  User.createBulk(data, callback);
};

module.exports = function () {
  it('create one', function (done) {
    var user = new _g.connection.User();
    user.name = 'John Doe';
    user.age = 27;
    expect(user).to.have.property('name', 'John Doe');
    expect(user).to.have.property('age', 27);
    done(null);
  });

  it('initialize in constructor', function (done) {
    var user = new _g.connection.User({name: 'John Doe', age: 27});
    expect(user).to.have.property('name', 'John Doe');
    expect(user).to.have.property('age', 27);
    done(null);
  });

  it('build method', function (done) {
    var user = _g.connection.User.build({name: 'John Doe', age: 27});
    expect(user).to.have.property('name', 'John Doe');
    expect(user).to.have.property('age', 27);
    done(null);
  });

  it('add a new record to the database', function (done) {
    var user = new _g.connection.User({name: 'John Doe', age: 27});
    user.save(function (error) {
      if (error) {
        return done(error);
      }
      expect(user).to.have.property('id');
      done(null);
    });
  });

  it('create method', function (done) {
    _g.connection.User.create({ name: 'John Doe', age: 27 }, function (error, user) {
      if (error) {
        return done(error);
      }
      expect(user).to.have.property('id');
      done(null);
    });
  });

  it('simple where', function (done) {
    _createUsers(_g.connection.User, function (error, users) {
      if (error) {
        return done(error);
      }
      _g.connection.User.where({age: 27}, function (error, users) {
        if (error) {
          return done(error);
        }
        expect(users).to.have.length(2)
        users.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
        expect(users[0]).to.have.property('name', 'Alice Jackson');
        expect(users[0]).to.have.property('age', 27);
        expect(users[1]).to.have.property('name', 'John Doe');
        expect(users[1]).to.have.property('age', 27);
        done(null);
      });
    });
  });

  it('where chain', function (done) {
    _createUsers(_g.connection.User, function (error, users) {
      if (error) {
        return done(error);
      }
      _g.connection.User.where({age: 27}).where({name: 'Alice Jackson'}).exec(function (error, users) {
        if (error) {
          return done(error);
        }
        expect(users).to.have.length(1);
        expect(users[0]).to.have.property('name', 'Alice Jackson');
        expect(users[0]).to.have.property('age', 27);
        done(null);
      });
    });
  });

  it('$or', function (done) {
    _createUsers(_g.connection.User, function (error, users) {
      if (error) {
        return done(error);
      }
      _g.connection.User.where({$or: [ { age: 32 }, { name: 'John Doe' } ]}, function (error, users) {
        if (error) {
          return done(error);
        }
        expect(users).to.have.length(2);
        users.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
        expect(users[0]).to.have.property('name', 'Gina Baker');
        expect(users[0]).to.have.property('age', 32);
        expect(users[1]).to.have.property('name', 'John Doe');
        expect(users[1]).to.have.property('age', 27);
        done(null);
      });
    });
  });
};
