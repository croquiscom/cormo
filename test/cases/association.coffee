should = require 'should'
async = require 'async'

module.exports = (models) ->
  it 'collection_accessor.build on a new object', (done) ->
    async.waterfall [
      # create two new objects
      (callback) ->
        user1 = new models.User name: 'John Doe', age: 27
        should.exist user1.posts
        user2 = new models.User name: 'Bill Smith', age: 45
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
