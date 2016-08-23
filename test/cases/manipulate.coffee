_g = require '../support/common'
async = require 'async'
{expect} = require 'chai'

_compareUser = (user, expected) ->
  expect(user).to.have.keys 'id', 'name', 'age'
  expect(user.name).to.equal expected.name
  expect(user.age).to.equal expected.age

module.exports = () ->
  it 'create simple', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.User.count callback
      (count, callback) ->
        expect(count).to.equal 0
        callback null
      (callback) ->
        _g.connection.manipulate { create_user: name: 'John Doe', age: 27 }, callback
      (id_to_record_map, callback) ->
        _g.connection.User.count callback
      (count, callback) ->
        expect(count).to.equal 1
        callback null
      (callback) ->
        _g.connection.User.where callback
      (users, callback) ->
        expect(users).to.have.length 1
        expect(users[0]).to.have.keys 'id', 'name', 'age'
        expect(users[0].name).to.equal 'John Doe'
        expect(users[0].age).to.equal 27
        callback null
    ], done

  it 'invalid model', (done) ->
    _g.connection.manipulate { create_account: name: 'John Doe', age: 27 }, (error, id_to_record_map) ->
      expect(error).to.exist
      expect(error).to.be.an.instanceof Error
      expect(error.message).to.equal 'model Account does not exist'
      done null
    return

  it 'create multiple', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_user: name: 'John Doe', age: 27 }
          { create_user: name: 'Bill Smith', age: 45 }
          { create_user: name: 'Alice Jackson', age: 27 }
        ], callback
      (id_to_record_map, callback) ->
        _g.connection.User.count callback
      (count, callback) ->
        expect(count).to.equal 3
        callback null
    ], done

  it 'delete all', (done) ->
    async.waterfall [
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
        expect(count).to.equal 0
        callback null
    ], done

  it 'delete some', (done) ->
    async.waterfall [
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
        expect(count).to.equal 1
        callback null
      (callback) ->
        _g.connection.User.where callback
      (users, callback) ->
        expect(users).to.have.length 1
        expect(users[0]).to.have.keys 'id', 'name', 'age'
        expect(users[0].name).to.equal 'Bill Smith'
        expect(users[0].age).to.equal 45
        callback null
    ], done

  it 'build association', (done) ->
    async.waterfall [
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
        expect(users).to.have.length 1
        expect(posts).to.have.length 1
        expect(posts[0].user_id).to.equal users[0].id
        callback null
    ], done

  it 'build association by real id', (done) ->
    async.waterfall [
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
        expect(users).to.have.length 1
        expect(posts).to.have.length 1
        expect(posts[0].user_id).to.equal users[0].id
        callback null
    ], done

  it 'id is not shared between manipulates', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_user: id: 'user1', name: 'John Doe', age: 27 }
        ], callback
      (id_to_record_map, callback) ->
        _g.connection.manipulate [
          { create_post: title: 'first post', body: 'This is the 1st post.', user_id: 'user1' }
        ], (error) ->
          expect(error).to.exist
          expect(error).to.be.an.instanceof Error
          callback null
    ], done

  it 'deleteAll', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_user: name: 'John Doe', age: 27 }
          { create_post: title: 'first post', body: 'This is the 1st post.' }
        ], callback
      (id_to_record_map, callback) ->
        _g.connection.User.count callback
      (count, callback) ->
        expect(count).to.equal 1
        callback null
      (callback) ->
        _g.connection.Post.count callback
      (count, callback) ->
        expect(count).to.equal 1
        callback null
      (callback) ->
        _g.connection.manipulate 'deleteAll', callback
      (id_to_record_map, callback) ->
        _g.connection.User.count callback
      (count, callback) ->
        expect(count).to.equal 0
        callback null
      (callback) ->
        _g.connection.Post.count callback
      (count, callback) ->
        expect(count).to.equal 0
        callback null
    ], done

  it 'find record', (done) ->
    async.waterfall [
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
        expect(users).to.be.an.instanceof Array
        expect(users).to.have.length 2
        users.sort (a, b) -> if a.name < b.name then -1 else 1
        _compareUser users[0], name: 'Alice Jackson', age: 27
        _compareUser users[1], name: 'John Doe', age: 27
        callback null
    ], done

  it 'build array column', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_user: id: 'user1', name: 'John Doe', age: 27 }
          { create_user: id: 'user2', name: 'Bill Smith', age: 45 }
          { create_user: id: 'user3', name: 'Alice Jackson', age: 27 }
          { create_post: title: 'first post', body: 'This is the 1st post.', user_id: 'user1', readers: ['user2', 'user3'] }
        ], callback
      (id_to_record_map, callback) ->
        _g.connection.Post.where (error, posts) ->
          callback error, [id_to_record_map.user1, id_to_record_map.user2, id_to_record_map.user3], posts
      (users, posts, callback) ->
        expect(users).to.have.length 3
        expect(posts).to.have.length 1
        expect(posts[0].user_id).to.equal users[0].id
        expect(posts[0].readers).to.eql [users[1].id, users[2].id]
        callback null
    ], done
