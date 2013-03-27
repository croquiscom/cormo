_compareUser = (user, expected) ->
  user.should.have.keys 'id', 'name', 'age'
  user.name.should.equal expected.name
  user.age.should.equal expected.age

module.exports = () ->
  it 'create simple', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.User.count callback
      (count, callback) ->
        count.should.equal 0
        callback null
      (callback) ->
        _g.connection.manipulate { create_user: name: 'John Doe', age: 27 }, callback
      (id_to_record_map, callback) ->
        _g.connection.User.count callback
      (count, callback) ->
        count.should.equal 1
        callback null
      (callback) ->
        _g.connection.User.where callback
      (users, callback) ->
        users.should.have.length 1
        users[0].should.have.keys 'id', 'name', 'age'
        users[0].name.should.be.equal 'John Doe'
        users[0].age.should.be.equal 27
        callback null
    ], done

  it 'invalid model', (done) ->
    _g.connection.manipulate { create_account: name: 'John Doe', age: 27 }, (error, id_to_record_map) ->
      should.exist error
      error.should.be.an.instanceOf Error
      error.message.should.be.equal 'model Account does not exist'
      done null

  it 'create multiple', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_user: name: 'John Doe', age: 27 }
          { create_user: name: 'Bill Smith', age: 45 }
          { create_user: name: 'Alice Jackson', age: 27 }
        ], callback
      (id_to_record_map, callback) ->
        _g.connection.User.count callback
      (count, callback) ->
        count.should.equal 3
        callback null
    ], done

  it 'delete all', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_user: name: 'John Doe', age: 27 }
          { create_user: name: 'Bill Smith', age: 45 }
          { create_user: name: 'Alice Jackson', age: 27 }
        ], callback
      (id_to_record_map, callback) ->
        _g.connection.manipulate 'delete_user', callback
      (id_to_record_map, callback) ->
        _g.connection.User.count callback
      (count, callback) ->
        count.should.equal 0
        callback null
    ], done

  it 'delete some', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_user: name: 'John Doe', age: 27 }
          { create_user: name: 'Bill Smith', age: 45 }
          { create_user: name: 'Alice Jackson', age: 27 }
        ], callback
      (id_to_record_map, callback) ->
        _g.connection.manipulate { delete_user: age: 27 }, callback
      (id_to_record_map, callback) ->
        _g.connection.User.count callback
      (count, callback) ->
        count.should.equal 1
        callback null
      (callback) ->
        _g.connection.User.where callback
      (users, callback) ->
        users.should.have.length 1
        users[0].should.have.keys 'id', 'name', 'age'
        users[0].name.should.be.equal 'Bill Smith'
        users[0].age.should.be.equal 45
        callback null
    ], done

  it 'build association', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_user: id: 'user1', name: 'John Doe', age: 27 }
          { create_post: title: 'first post', body: 'This is the 1st post.', user_id: 'user1' }
        ], callback
      (id_to_record_map, callback) ->
        _g.connection.User.where callback
      (users, callback) ->
        _g.connection.Post.where (error, posts) ->
          callback error, users, posts
      (users, posts, callback) ->
        users.should.have.length 1
        posts.should.have.length 1
        posts[0].user_id.should.be.equal users[0].id
        callback null
    ], done

  it 'build association by real id', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_user: id: 'user1', name: 'John Doe', age: 27 }
        ], callback
      (id_to_record_map, callback) ->
        _g.connection.manipulate [
          { create_post: title: 'first post', body: 'This is the 1st post.', user_id: id_to_record_map.user1.id }
        ], callback
      (id_to_record_map, callback) ->
        _g.connection.User.where callback
      (users, callback) ->
        _g.connection.Post.where (error, posts) ->
          callback error, users, posts
      (users, posts, callback) ->
        users.should.have.length 1
        posts.should.have.length 1
        posts[0].user_id.should.be.equal users[0].id
        callback null
    ], done

  it 'id is not shared between manipulates', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_user: id: 'user1', name: 'John Doe', age: 27 }
        ], callback
      (id_to_record_map, callback) ->
        _g.connection.manipulate [
          { create_post: title: 'first post', body: 'This is the 1st post.', user_id: 'user1' }
        ], (error) ->
          should.exist error
          error.should.be.an.instanceOf Error
          callback null
    ], done

  it 'deleteAll', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_user: name: 'John Doe', age: 27 }
          { create_post: title: 'first post', body: 'This is the 1st post.' }
        ], callback
      (id_to_record_map, callback) ->
        _g.connection.User.count callback
      (count, callback) ->
        count.should.equal 1
        callback null
      (callback) ->
        _g.connection.Post.count callback
      (count, callback) ->
        count.should.equal 1
        callback null
      (callback) ->
        _g.connection.manipulate 'deleteAll', callback
      (id_to_record_map, callback) ->
        _g.connection.User.count callback
      (count, callback) ->
        count.should.equal 0
        callback null
      (callback) ->
        _g.connection.Post.count callback
      (count, callback) ->
        count.should.equal 0
        callback null
    ], done

  it 'find record', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_user: name: 'John Doe', age: 27 }
          { create_user: name: 'Bill Smith', age: 45 }
          { create_user: name: 'Alice Jackson', age: 27 }
        ], callback
      (id_to_record_map, callback) ->
        _g.connection.manipulate [
          { find_users: id: 'users', age: 27 }
        ], callback
      (id_to_record_map, callback) ->
        users = id_to_record_map.users
        users.should.be.an.instanceOf Array
        users.should.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'John Doe', age: 27
        callback null
    ], done
