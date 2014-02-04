{expect} = require 'chai'

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
    _g.async.waterfall [
      (callback) ->
        _g.connection.Post.query().include('user').exec callback
      (posts, callback) ->
        expect(posts).to.have.length 3

        expect(posts[0].title).to.equal 'first post'
        expect(posts[0]).to.have.property 'user'
        expect(posts[0].user).to.have.keys 'id', 'name', 'age'
        expect(posts[0].user.id).to.equal preset_users[0].id
        expect(posts[0].user.name).to.equal 'John Doe'

        expect(posts[1].title).to.equal 'second post'
        expect(posts[1]).to.have.property 'user'
        expect(posts[1].user).to.have.keys 'id', 'name', 'age'
        expect(posts[1].user.id).to.equal preset_users[0].id
        expect(posts[1].user.name).to.equal 'John Doe'

        expect(posts[2].title).to.equal 'another post'
        expect(posts[2]).to.have.property 'user'
        expect(posts[2].user).to.have.keys 'id', 'name', 'age'
        expect(posts[2].user.id).to.equal preset_users[1].id
        expect(posts[2].user.name).to.equal 'Bill Smith'

        callback null
    ], done

  it 'include an object that belongs to', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.Post.find(preset_posts[0].id).include('user').exec callback
      (post, callback) ->
        expect(post.title).to.equal 'first post'
        expect(post).to.have.property 'user'
        expect(post.user).to.have.keys 'id', 'name', 'age'
        expect(post.user.id).to.equal preset_users[0].id
        expect(post.user.name).to.equal 'John Doe'

        callback null
    ], done

  it 'include objects that belong to with select', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.Post.query().include('user', 'name').exec callback
      (posts, callback) ->
        expect(posts).to.have.length 3

        expect(posts[0].title).to.equal 'first post'
        expect(posts[0]).to.have.property 'user'
        expect(posts[0].user).to.have.keys 'id', 'name'
        expect(posts[0].user.id).to.equal preset_users[0].id
        expect(posts[0].user.name).to.equal 'John Doe'

        expect(posts[1].title).to.equal 'second post'
        expect(posts[1]).to.have.property 'user'
        expect(posts[1].user).to.have.keys 'id', 'name'
        expect(posts[1].user.id).to.equal preset_users[0].id
        expect(posts[1].user.name).to.equal 'John Doe'

        expect(posts[2].title).to.equal 'another post'
        expect(posts[2]).to.have.property 'user'
        expect(posts[2].user).to.have.keys 'id', 'name'
        expect(posts[2].user.id).to.equal preset_users[1].id
        expect(posts[2].user.name).to.equal 'Bill Smith'

        callback null
    ], done

  it 'include objects that have many', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.User.query().include('posts').exec callback
      (users, callback) ->
        expect(users).to.have.length 2

        expect(users[0].name).to.equal 'John Doe'
        expect(users[0]).to.have.property 'posts'
        expect(users[0].posts).to.have.length 2
        if _g.connection.User.eliminate_null
          expect(users[0].posts[0]).to.have.keys 'id', 'user_id', 'title', 'body'
        else
          expect(users[0].posts[0]).to.have.keys 'id', 'user_id', 'title', 'body', 'parent_post_id'
        expect(users[0].posts[0].id).to.equal preset_posts[0].id
        expect(users[0].posts[0].title).to.equal 'first post'
        if _g.connection.User.eliminate_null
          expect(users[0].posts[1]).to.have.keys 'id', 'user_id', 'title', 'body'
        else
          expect(users[0].posts[1]).to.have.keys 'id', 'user_id', 'title', 'body', 'parent_post_id'
        expect(users[0].posts[1].id).to.equal preset_posts[1].id
        expect(users[0].posts[1].title).to.equal 'second post'

        expect(users[1].name).to.equal 'Bill Smith'
        expect(users[1].posts).to.have.length 1
        if _g.connection.User.eliminate_null
          expect(users[1].posts[0]).to.have.keys 'id', 'user_id', 'title', 'body'
        else
          expect(users[1].posts[0]).to.have.keys 'id', 'user_id', 'title', 'body', 'parent_post_id'
        expect(users[1].posts[0].id).to.equal preset_posts[2].id
        expect(users[1].posts[0].title).to.equal 'another post'

        callback null
    ], done

  it 'include an object that has many', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.User.find(preset_users[0].id).include('posts').exec callback
      (user, callback) ->
        expect(user.name).to.equal 'John Doe'
        expect(user).to.have.property 'posts'
        expect(user.posts).to.have.length 2
        if _g.connection.User.eliminate_null
          expect(user.posts[0]).to.have.keys 'id', 'user_id', 'title', 'body'
        else
          expect(user.posts[0]).to.have.keys 'id', 'user_id', 'title', 'body', 'parent_post_id'
        expect(user.posts[0].id).to.equal preset_posts[0].id
        expect(user.posts[0].title).to.equal 'first post'
        if _g.connection.User.eliminate_null
          expect(user.posts[1]).to.have.keys 'id', 'user_id', 'title', 'body'
        else
          expect(user.posts[1]).to.have.keys 'id', 'user_id', 'title', 'body', 'parent_post_id'
        expect(user.posts[1].id).to.equal preset_posts[1].id
        expect(user.posts[1].title).to.equal 'second post'

        callback null
    ], done

  it 'include objects that have many with select', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.User.query().include('posts', 'title').exec callback
      (users, callback) ->
        expect(users).to.have.length 2

        expect(users[0].name).to.equal 'John Doe'
        expect(users[0]).to.have.property 'posts'
        expect(users[0].posts).to.have.length 2
        expect(users[0].posts[0]).to.have.keys 'id', 'user_id', 'title'
        expect(users[0].posts[0].id).to.equal preset_posts[0].id
        expect(users[0].posts[0].title).to.equal 'first post'
        expect(users[0].posts[1]).to.have.keys 'id', 'user_id', 'title'
        expect(users[0].posts[1].id).to.equal preset_posts[1].id
        expect(users[0].posts[1].title).to.equal 'second post'

        expect(users[1].name).to.equal 'Bill Smith'
        expect(users[1].posts).to.have.length 1
        expect(users[1].posts[0]).to.have.keys 'id', 'user_id', 'title'
        expect(users[1].posts[0].id).to.equal preset_posts[2].id
        expect(users[1].posts[0].title).to.equal 'another post'

        callback null
    ], done
