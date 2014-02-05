async = require 'async'
{expect} = require 'chai'

_comparePost = (a, b) ->
  expect(a).to.have.property 'user_id', b.user_id
  expect(a).to.have.property 'title', b.title
  expect(a).to.have.property 'body', b.body

module.exports = () ->
  it 'collection_accessor.build on a new object', (done) ->
    async.waterfall [
      # create two new objects
      (callback) ->
        user1 = _g.connection.User.build name: 'John Doe', age: 27
        expect(user1.posts).to.exist
        user2 = _g.connection.User.build name: 'Bill Smith', age: 45
        expect(user2.posts).to.exist
        callback null, user1, user2
      # check default status
      (user1, user2, callback) ->
        user1.posts (error, posts) ->
          expect(posts).to.have.length 0
          return callback error if error
          user2.posts (error, posts) ->
            expect(posts).to.have.length 0
            return callback error if error
            callback null, user1.posts, user2.posts
      # call build method and check status
      (posts1, posts2, callback) ->
        posts1.build title: 'first post', body: 'This is the 1st post.'
        posts1.build title: 'second post', body: 'This is the 2nd post.'
        posts2.build title: 'third post', body: 'This is the 3rd post.'
        posts1 (error, posts) ->
          return callback error if error
          expect(posts).to.have.length 2
          expect(posts[0].user_id).to.not.exist
          expect(posts[0]).to.have.property 'title', 'first post'
          expect(posts[1].user_id).to.not.exist
          expect(posts[1]).to.have.property 'title', 'second post'
          posts2 (error, posts) ->
            return callback error if error
            expect(posts).to.have.length 1
            expect(posts[0].user_id).to.not.exist
            expect(posts[0]).to.have.property 'title', 'third post'
            callback null
    ], (error) ->
      done error

  it 'collection_accessor.build on an existing object', (done) ->
    async.waterfall [
      # create two new objects
      (callback) ->
        _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user1) ->
          return callback error if error
          expect(user1.posts).to.exist
          _g.connection.User.create { name: 'Bill Smith', age: 45 }, (error, user2) ->
            return callback error if error
            expect(user2.posts).to.exist
            callback null, user1, user2
      # check default status
      (user1, user2, callback) ->
        user1.posts (error, posts) ->
          expect(posts).to.have.length 0
          return callback error if error
          user2.posts (error, posts) ->
            expect(posts).to.have.length 0
            return callback error if error
            callback null, user1, user2, user1.posts, user2.posts
      # call build method and check status
      (user1, user2, posts1, posts2, callback) ->
        posts1.build title: 'first post', body: 'This is the 1st post.'
        posts1.build title: 'second post', body: 'This is the 2nd post.'
        posts2.build title: 'third post', body: 'This is the 3rd post.'
        posts1 (error, posts) ->
          return callback error if error
          expect(posts).to.have.length 2
          expect(posts[0]).to.have.property 'user_id', user1.id
          expect(posts[0]).to.have.property 'title', 'first post'
          expect(posts[1]).to.have.property 'user_id', user1.id
          expect(posts[1]).to.have.property 'title', 'second post'
          posts2 (error, posts) ->
            return callback error if error
            expect(posts).to.have.length 1
            expect(posts[0]).to.have.property 'user_id', user2.id
            expect(posts[0]).to.have.property 'title', 'third post'
            callback null
    ], (error) ->
      done error

  it 'save object after creating a sub object', (done) ->
    user = _g.connection.User.build name: 'John Doe', age: 27
    post = user.posts.build title: 'first post', body: 'This is the 1st post.'
    expect(user.id).to.not.exist
    expect(post.id).to.not.exist
    expect(post.user_id).to.not.exist
    user.save (error) ->
      return done error if error
      expect(user).to.have.property 'id'
      expect(post).to.have.property 'id'
      expect(post).to.have.property 'user_id', user.id
      done null

  it 'get sub objects', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      _g.connection.Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }, (error, post1) ->
        _g.connection.Post.create { title: 'second post', body: 'This is the 2nd post.', user_id: user.id }, (error, post2) ->
          user.posts (error, posts) ->
            expect(posts).to.have.length 2
            posts.sort (a, b) -> if a.body < b.body then -1 else 1
            _comparePost posts[0], post1
            _comparePost posts[1], post2
            done null

  it 'sub objects are cached', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      _g.connection.Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }, (error, post1) ->
        user.posts (error, posts) ->
          expect(posts).to.have.length 1
          _comparePost posts[0], post1
          _g.connection.Post.create { title: 'second post', body: 'This is the 2nd post.', user_id: user.id }, (error, post2) ->
            user.posts (error, posts) ->
              # added object is not fetched
              expect(posts).to.have.length 1
              _comparePost posts[0], post1
              # ignore cache and force reload
              user.posts true, (error, posts) ->
                expect(posts).to.have.length 2
                posts.sort (a, b) -> if a.body < b.body then -1 else 1
                _comparePost posts[0], post1
                _comparePost posts[1], post2
                done null
