_g = require '../support/common'
{expect} = require 'chai'

_compareComment = (a, b) ->
  expect(a).to.have.property 'title', b.title
  expect(a).to.have.property 'body', b.body
  expect(a).to.have.property 'parent_post_id', b.parent_post_id

module.exports = () ->
  it 'get sub objects', ->
    post = await _g.connection.Post.create { title: 'my post', body: 'This is a my post.' }
    comment1 = await _g.connection.Post.create { title: 'first comment', body: 'This is the 1st comment.', parent_post_id: post.id }
    comment2 = await _g.connection.Post.create { title: 'second comment', body: 'This is the 2nd comment.', parent_post_id: post.id }
    comments = await post.comments()
    expect(comments).to.have.length 2
    comments.sort (a, b) -> if a.body < b.body then -1 else 1
    _compareComment comments[0], comment1
    _compareComment comments[1], comment2
    return

  it 'get associated object', ->
    post = await _g.connection.Post.create { title: 'my post', body: 'This is a my post.' }
    comment1 = await _g.connection.Post.create { title: 'first comment', body: 'This is the 1st comment.', parent_post_id: post.id }
    record = await comment1.parent_post()
    expect(post).to.have.property 'id', record.id
    expect(post).to.have.property 'title', record.title
    expect(post).to.have.property 'body', record.body
    return
