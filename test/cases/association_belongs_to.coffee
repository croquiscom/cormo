_g = require '../support/common'
async = require 'async'
{expect} = require 'chai'

module.exports = () ->
  it 'get associated object', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      _g.connection.Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }, (error, post) ->
        return done error if error
        post.user (error, record) ->
          return done error if error
          expect(user).to.eql record
          done null
    return

  it 'lean option for association', (done) ->
    async.waterfall [
      (callback) ->
        _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
          return callback error if error
          _g.connection.Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }, (error, post) ->
            return callback error if error
            callback null, user.id, post.id
      (user_id, post_id, callback) ->
        _g.connection.Post.find(post_id).lean().exec (error, post) ->
          return callback error if error
          expect(post.id).to.equal post_id
          expect(post.title).to.equal 'first post'
          expect(post.body).to.equal 'This is the 1st post.'
          expect(post.user_id).to.equal user_id
          expect(post.parent_post_id).to.not.exist
          callback null
    ], done
