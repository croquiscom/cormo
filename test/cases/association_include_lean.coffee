async = require 'async'
{expect} = require 'chai'

_checkPost = (post, title, user_id, user_name, user_age) ->
  expect(post).to.not.be.an.instanceof _g.connection.Post
  expect(post).to.have.property 'title', title
  expect(post).to.have.property 'user'

  if user_id
    expect(post.user).to.not.be.an.instanceof _g.connection.User
    if user_age
      expect(post.user).to.have.keys 'id', 'name', 'age'
    else
      expect(post.user).to.have.keys 'id', 'name'
    expect(post.user).to.have.property 'id', user_id
    expect(post.user).to.have.property 'name', user_name
    if user_age
      expect(post.user).to.have.property 'age', user_age
  else
    expect(post.user).to.not.exist

_checkUser = (user, name, post_ids, post_titles, has_post_body) ->
  expect(user).to.not.be.an.instanceof _g.connection.User
  expect(user).to.have.property 'name', name
  expect(user).to.have.property 'posts'

  expect(user.posts).to.have.length post_ids.length
  for post, i in user.posts
    expect(post).to.not.be.an.instanceof _g.connection.Post
    if not has_post_body
      expect(post).to.have.keys 'id', 'user_id', 'title'
    else
      expect(post).to.have.keys 'id', 'user_id', 'title', 'body', 'parent_post_id'
    expect(post.id).to.equal post_ids[i]
    expect(post.title).to.equal post_titles[i]

module.exports = ->
  preset_users = undefined
  preset_posts = undefined

  beforeEach (done) ->
    _g.connection.User.createBulk [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
    ], (error, users) ->
      return done error if error
      preset_users = users
      _g.connection.Post.createBulk [
        { user_id: users[0].id, title: 'first post', body: 'This is the 1st post.' }
        { user_id: users[0].id, title: 'second post', body: 'This is the 2st post.' }
        { user_id: users[1].id, title: 'another post', body: 'This is a post by user1.' }
      ], (error, posts) ->
        return done error if error
        preset_posts = posts
        done null

  it 'include objects that belong to', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.Post.query().lean().include('user').exec callback
      (posts, callback) ->
        expect(posts).to.have.length 3
        _checkPost posts[0], 'first post', preset_users[0].id, 'John Doe', 27
        _checkPost posts[1], 'second post', preset_users[0].id, 'John Doe', 27
        _checkPost posts[2], 'another post', preset_users[1].id, 'Bill Smith', 45
        callback null
    ], done

  it 'include an object that belongs to', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.Post.find(preset_posts[0].id).lean().include('user').exec callback
      (post, callback) ->
        _checkPost post, 'first post', preset_users[0].id, 'John Doe', 27
        callback null
    ], done

  it 'include objects that belong to with select', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.Post.query().lean().include('user', 'name').exec callback
      (posts, callback) ->
        expect(posts).to.have.length 3
        _checkPost posts[0], 'first post', preset_users[0].id, 'John Doe'
        _checkPost posts[1], 'second post', preset_users[0].id, 'John Doe'
        _checkPost posts[2], 'another post', preset_users[1].id, 'Bill Smith'
        callback null
    ], done

  it 'include objects that have many', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.User.query().lean().include('posts').exec callback
      (users, callback) ->
        expect(users).to.have.length 2
        _checkUser users[0], 'John Doe', [preset_posts[0].id, preset_posts[1].id], ['first post', 'second post'], true
        _checkUser users[1], 'Bill Smith', [preset_posts[2].id], ['another post'], true
        callback null
    ], done

  it 'include an object that has many', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.User.find(preset_users[0].id).lean().include('posts').exec callback
      (user, callback) ->
        _checkUser user, 'John Doe', [preset_posts[0].id, preset_posts[1].id], ['first post', 'second post'], true
        callback null
    ], done

  it 'include objects that have many with select', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.User.query().lean().include('posts', 'title').exec callback
      (users, callback) ->
        expect(users).to.have.length 2
        _checkUser users[0], 'John Doe', [preset_posts[0].id, preset_posts[1].id], ['first post', 'second post'], false
        _checkUser users[1], 'Bill Smith', [preset_posts[2].id], ['another post'], false
        callback null
    ], done

  it 'null id', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.Post.find(preset_posts[1].id).update user_id: null, (error) ->
          callback error
      (callback) ->
        _g.connection.Post.query().lean().include('user').order('id').exec callback
      (posts, callback) ->
        expect(posts).to.have.length 3
        _checkPost posts[0], 'first post', preset_users[0].id, 'John Doe', 27
        _checkPost posts[1], 'second post', null
        _checkPost posts[2], 'another post', preset_users[1].id, 'Bill Smith', 45
        callback null
      (callback) ->
        _g.connection.User.query().lean().include('posts').order('id').exec callback
      (users, callback) ->
        expect(users).to.have.length 2
        _checkUser users[0], 'John Doe', [preset_posts[0].id], ['first post'], true
        _checkUser users[1], 'Bill Smith', [preset_posts[2].id], ['another post'], true
        callback null
    ], done

  it 'invalid id', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.User.find(preset_users[1].id).delete (error) ->
          callback error
      (callback) ->
        _g.connection.Post.query().lean().include('user').order('id').exec callback
      (posts, callback) ->
        expect(posts).to.have.length 3
        _checkPost posts[0], 'first post', preset_users[0].id, 'John Doe', 27
        _checkPost posts[1], 'second post', preset_users[0].id, 'John Doe', 27
        _checkPost posts[2], 'another post', null
        callback null
      (callback) ->
        _g.connection.Post.find(preset_posts[2].id).lean().include('user').exec callback
      (post, callback) ->
        _checkPost post, 'another post', null
        callback null
    ], done

  it 'modify associated property (belongs to)', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.Post.find(preset_posts[0].id).lean().include('user').exec callback
      (post, callback) ->
        post.user = 'other value'
        expect(post.user).to.be.equal 'other value'
        callback null
    ], done

  it 'modify associated property (has many)', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.User.find(preset_users[0].id).lean().include('posts').exec callback
      (user, callback) ->
        user.posts = 'other value'
        expect(user.posts).to.be.equal 'other value'
        callback null
    ], done
