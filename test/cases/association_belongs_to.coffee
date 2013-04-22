module.exports = () ->
  it 'get associated object', (done) ->
    _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
      return done error if error
      _g.connection.Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }, (error, post) ->
        return done error if error
        post.user (error, record) ->
          return done error if error
          user.should.eql record
          done null

  it 'return_raw_instance for association', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
          return callback error if error
          _g.connection.Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }, (error, post) ->
            return callback error if error
            callback null, user.id, post.id
      (user_id, post_id, callback) ->
        _g.connection.Post.find(post_id).return_raw_instance().exec (error, post) ->
          return callback error if error
          post.id.should.equal post_id
          post.title.should.equal 'first post'
          post.body.should.equal 'This is the 1st post.'
          post.user_id.should.equal user_id
          should.not.exist post.parent_post_id
          callback null
    ], done
