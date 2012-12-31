module.exports = (connection, models) ->
  it 'create simple', (done) ->
    async.waterfall [
      (callback) ->
        models.User.count callback
      (count, callback) ->
        count.should.equal 0
        callback null
      (callback) ->
        connection.manipulate { create_user: name: 'John Doe', age: 27 }, callback
      (id_to_record_map, callback) ->
        models.User.count callback
      (count, callback) ->
        count.should.equal 1
        callback null
      (callback) ->
        models.User.where callback
      (users, callback) ->
        users.should.have.length 1
        users[0].should.have.keys 'id', 'name', 'age'
        users[0].name.should.be.equal 'John Doe'
        users[0].age.should.be.equal 27
        callback null
    ], done

  it 'invalid model', (done) ->
    connection.manipulate { create_account: name: 'John Doe', age: 27 }, (error, id_to_record_map) ->
      should.exist error
      error.should.be.an.instanceOf Error
      error.message.should.be.equal 'model Account does not exist'
      done null

  it 'create multiple', (done) ->
    async.waterfall [
      (callback) ->
        connection.manipulate [
          { create_user: name: 'John Doe', age: 27 }
          { create_user: name: 'Bill Smith', age: 45 }
          { create_user: name: 'Alice Jackson', age: 27 }
        ], callback
      (id_to_record_map, callback) ->
        models.User.count callback
      (count, callback) ->
        count.should.equal 3
        callback null
    ], done

  it 'delete all', (done) ->
    async.waterfall [
      (callback) ->
        connection.manipulate [
          { create_user: name: 'John Doe', age: 27 }
          { create_user: name: 'Bill Smith', age: 45 }
          { create_user: name: 'Alice Jackson', age: 27 }
        ], callback
      (id_to_record_map, callback) ->
        connection.manipulate 'delete_user', callback
      (id_to_record_map, callback) ->
        models.User.count callback
      (count, callback) ->
        count.should.equal 0
        callback null
    ], done

  it 'delete some', (done) ->
    async.waterfall [
      (callback) ->
        connection.manipulate [
          { create_user: name: 'John Doe', age: 27 }
          { create_user: name: 'Bill Smith', age: 45 }
          { create_user: name: 'Alice Jackson', age: 27 }
        ], callback
      (id_to_record_map, callback) ->
        connection.manipulate { delete_user: age: 27 }, callback
      (id_to_record_map, callback) ->
        models.User.count callback
      (count, callback) ->
        count.should.equal 1
        callback null
      (callback) ->
        models.User.where callback
      (users, callback) ->
        users.should.have.length 1
        users[0].should.have.keys 'id', 'name', 'age'
        users[0].name.should.be.equal 'Bill Smith'
        users[0].age.should.be.equal 45
        callback null
    ], done

  it 'build association', (done) ->
    async.waterfall [
      (callback) ->
        connection.manipulate [
          { create_user: id: 'user1', name: 'John Doe', age: 27 }
          { create_post: title: 'first post', body: 'This is the 1st post.', user_id: 'user1' }
        ], callback
      (id_to_record_map, callback) ->
        models.User.where callback
      (users, callback) ->
        models.Post.where (error, posts) ->
          callback error, users, posts
      (users, posts, callback) ->
        users.should.have.length 1
        posts.should.have.length 1
        posts[0].user_id.should.be.equal users[0].id
        callback null
    ], done

  it 'deleteAll', (done) ->
    async.waterfall [
      (callback) ->
        connection.manipulate [
          { create_user: name: 'John Doe', age: 27 }
          { create_post: title: 'first post', body: 'This is the 1st post.' }
        ], callback
      (id_to_record_map, callback) ->
        models.User.count callback
      (count, callback) ->
        count.should.equal 1
        callback null
      (callback) ->
        models.Post.count callback
      (count, callback) ->
        count.should.equal 1
        callback null
      (callback) ->
        connection.manipulate 'deleteAll', callback
      (id_to_record_map, callback) ->
        models.User.count callback
      (count, callback) ->
        count.should.equal 0
        callback null
      (callback) ->
        models.Post.count callback
      (count, callback) ->
        count.should.equal 0
        callback null
    ], done
