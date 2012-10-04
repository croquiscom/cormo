should = require 'should'
async = require 'async'

module.exports = (models) ->
  it 'create one-to-many records', (done) ->
    async.waterfall [
      (callback) ->
        user1 = new models.User name: 'John Doe', age: 27
        should.exist user1.posts
        user2 = new models.User name: 'Bill Smith', age: 45
        should.exist user2.posts
        callback null, user1, user2
      (user1, user2, callback) ->
        user1.posts (error, posts) ->
          posts.should.have.length 0
          return callback error if error
          user2.posts (error, posts) ->
            posts.should.have.length 0
            return callback error if error
            callback null, user1.posts, user2.posts
      (posts1, posts2, callback) ->
        posts1.build title: 'first post', body: 'This is the 1st post.'
        posts1.build title: 'second post', body: 'This is the 2nd post.'
        posts2.build title: 'third post', body: 'This is the 3rd post.'
        posts1 (error, posts) ->
          return callback error if error
          posts.should.have.length 2
          posts[0].should.have.property 'title', 'first post'
          posts[1].should.have.property 'title', 'second post'
          posts2 (error, posts) ->
            return callback error if error
            posts.should.have.length 1
            posts[0].should.have.property 'title', 'third post'
            callback null
    ], (error) ->
      done error
