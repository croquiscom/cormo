_compareComment = (a, b) ->
  a.should.have.property 'title', b.title
  a.should.have.property 'body', b.body
  a.should.have.property 'parent_post_id', b.parent_post_id

module.exports = (models) ->
  it 'get sub objects', (done) ->
    models.Post.create { title: 'my post', body: 'This is a my post.' }, (error, post) ->
      return done error if error
      models.Post.create { title: 'first comment', body: 'This is the 1st comment.', parent_post_id: post.id }, (error, comment1) ->
        return done error if error
        models.Post.create { title: 'second comment', body: 'This is the 2nd comment.', parent_post_id: post.id }, (error, comment2) ->
          return done error if error
          post.comments (error, comments) ->
            return done error if error
            comments.should.have.length 2
            comments.sort (a, b) -> if a.body < b.body then -1 else 1
            _compareComment comments[0], comment1
            _compareComment comments[1], comment2
            done null

  it 'get associated object', (done) ->
    models.Post.create { title: 'my post', body: 'This is a my post.' }, (error, post) ->
      return done error if error
      models.Post.create { title: 'first comment', body: 'This is the 1st comment.', parent_post_id: post.id }, (error, comment1) ->
        return done error if error
        comment1.parent_post (error, record) ->
          return done error if error
          post.should.have.property 'id', record.id
          post.should.have.property 'title', record.title
          post.should.have.property 'body', record.body
          done null
