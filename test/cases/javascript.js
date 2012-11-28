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

module.exports = function (models) {
  it('create one', function (done) {
    var user = new models.User();
    user.name = 'John Doe';
    user.age = 27;
    user.should.have.property('name', 'John Doe');
    user.should.have.property('age', 27);
    done(null);
  });

  it('initialize in constructor', function (done) {
    var user = new models.User({name: 'John Doe', age: 27});
    user.should.have.property('name', 'John Doe');
    user.should.have.property('age', 27);
    done(null);
  });

  it('build method', function (done) {
    var user = models.User.build({name: 'John Doe', age: 27});
    user.should.have.property('name', 'John Doe');
    user.should.have.property('age', 27);
    done(null);
  });

  it('add a new record to the database', function (done) {
    var user = new models.User({name: 'John Doe', age: 27});
    user.save(function (error) {
      if (error) {
        return done(error);
      }
      user.should.have.property('id');
      done(null);
    });
  });

  it('create method', function (done) {
    models.User.create({ name: 'John Doe', age: 27 }, function (error, user) {
      if (error) {
        return done(error);
      }
      user.should.have.property('id');
      done(null);
    });
  });

  it('simple where', function (done) {
    _createUsers(models.User, function (error, users) {
      if (error) {
        return done(error);
      }
      models.User.where({age: 27}, function (error, users) {
        if (error) {
          return done(error);
        }
        users.should.have.length(2)
        users.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
        users[0].should.have.property('name', 'Alice Jackson');
        users[0].should.have.property('age', 27);
        users[1].should.have.property('name', 'John Doe');
        users[1].should.have.property('age', 27);
        done(null);
      });
    });
  });

  it('where chain', function (done) {
    _createUsers(models.User, function (error, users) {
      if (error) {
        return done(error);
      }
      models.User.where({age: 27}).where({name: 'Alice Jackson'}).exec(function (error, users) {
        if (error) {
          return done(error);
        }
        users.should.have.length(1);
        users[0].should.have.property('name', 'Alice Jackson');
        users[0].should.have.property('age', 27);
        done(null);
      });
    });
  });

  it('$or', function (done) {
    _createUsers(models.User, function (error, users) {
      if (error) {
        return done(error);
      }
      models.User.where({$or: [ { age: 32 }, { name: 'John Doe' } ]}, function (error, users) {
        if (error) {
          return done(error);
        }
        users.should.have.length(2);
        users.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
        users[0].should.have.property('name', 'Gina Baker');
        users[0].should.have.property('age', 32);
        users[1].should.have.property('name', 'John Doe');
        users[1].should.have.property('age', 27);
        done(null);
      });
    });
  });
};
