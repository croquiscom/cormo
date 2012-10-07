should = require 'should'
async = require 'async'

_comparePost = (a, b) ->
  a.should.have.property 'user_id', b.user_id
  a.should.have.property 'title', b.title
  a.should.have.property 'body', b.body

module.exports = (models) ->
  it 'collection_accessor.build on a new object', (done) ->
    async.waterfall [
      # create two new objects
      (callback) ->
        user1 = models.User.build name: 'John Doe', age: 27
        should.exist user1.posts
        user2 = models.User.build name: 'Bill Smith', age: 45
        should.exist user2.posts
        callback null, user1, user2
      # check default status
      (user1, user2, callback) ->
        user1.posts (error, posts) ->
          posts.should.have.length 0
          return callback error if error
          user2.posts (error, posts) ->
            posts.should.have.length 0
            return callback error if error
            callback null, user1.posts, user2.posts
      # call build method and check status
      (posts1, posts2, callback) ->
        posts1.build title: 'first post', body: 'This is the 1st post.'
        posts1.build title: 'second post', body: 'This is the 2nd post.'
        posts2.build title: 'third post', body: 'This is the 3rd post.'
        posts1 (error, posts) ->
          return callback error if error
          posts.should.have.length 2
          should.not.exist posts[0].user_id
          posts[0].should.have.property 'title', 'first post'
          should.not.exist posts[1].user_id
          posts[1].should.have.property 'title', 'second post'
          posts2 (error, posts) ->
            return callback error if error
            posts.should.have.length 1
            should.not.exist posts[0].user_id
            posts[0].should.have.property 'title', 'third post'
            callback null
    ], (error) ->
      done error

  it 'collection_accessor.build on an existing object', (done) ->
    async.waterfall [
      # create two new objects
      (callback) ->
        models.User.create { name: 'John Doe', age: 27 }, (error, user1) ->
          return callback error if error
          should.exist user1.posts
          models.User.create { name: 'Bill Smith', age: 45 }, (error, user2) ->
            return callback error if error
            should.exist user2.posts
            callback null, user1, user2
      # check default status
      (user1, user2, callback) ->
        user1.posts (error, posts) ->
          posts.should.have.length 0
          return callback error if error
          user2.posts (error, posts) ->
            posts.should.have.length 0
            return callback error if error
            callback null, user1, user2, user1.posts, user2.posts
      # call build method and check status
      (user1, user2, posts1, posts2, callback) ->
        posts1.build title: 'first post', body: 'This is the 1st post.'
        posts1.build title: 'second post', body: 'This is the 2nd post.'
        posts2.build title: 'third post', body: 'This is the 3rd post.'
        posts1 (error, posts) ->
          return callback error if error
          posts.should.have.length 2
          posts[0].should.have.property 'user_id', user1.id
          posts[0].should.have.property 'title', 'first post'
          posts[1].should.have.property 'user_id', user1.id
          posts[1].should.have.property 'title', 'second post'
          posts2 (error, posts) ->
            return callback error if error
            posts.should.have.length 1
            posts[0].should.have.property 'user_id', user2.id
            posts[0].should.have.property 'title', 'third post'
            callback null
    ], (error) ->
      done error

  it 'save object after creating a sub object', (done) ->
    user = models.User.build name: 'John Doe', age: 27
    post = user.posts.build title: 'first post', body: 'This is the 1st post.'
    should.not.exist user.id
    should.not.exist post.id
    should.not.exist post.user_id
    user.save (error) ->
      return done error if error
      user.should.have.property 'id'
      post.should.have.property 'id'
      post.should.have.property 'user_id', user.id
      done null

  it 'get sub objects', (done) ->
    models.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      models.Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }, (error, post1) ->
        models.Post.create { title: 'second post', body: 'This is the 2nd post.', user_id: user.id }, (error, post2) ->
          user.posts (error, posts) ->
            posts.should.have.length 2
            posts.sort (a, b) -> if a.body < b.body then -1 else 1
            _comparePost posts[0], post1
            _comparePost posts[1], post2
            done null

  it 'sub objects are cached', (done) ->
    models.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      models.Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }, (error, post1) ->
        user.posts (error, posts) ->
          posts.should.have.length 1
          _comparePost posts[0], post1
          models.Post.create { title: 'second post', body: 'This is the 2nd post.', user_id: user.id }, (error, post2) ->
            user.posts (error, posts) ->
              # added object is not fetched
              posts.should.have.length 1
              _comparePost posts[0], post1
              # ignore cache and force reload
              user.posts true, (error, posts) ->
                posts.should.have.length 2
                posts.sort (a, b) -> if a.body < b.body then -1 else 1
                _comparePost posts[0], post1
                _comparePost posts[1], post2
                done null
