_g = require '../support/common'
{expect} = require 'chai'

module.exports = () ->
  it 'get associated object', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    post = await _g.connection.Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }
    record = await post.user()
    expect(user).to.eql record
    return

  it 'lean option for association', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }, (error, user) ->
    post = await _g.connection.Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }
    user_id = user.id
    post_id = post.id
    post = await _g.connection.Post.find(post_id).lean()
    expect(post.id).to.equal post_id
    expect(post.title).to.equal 'first post'
    expect(post.body).to.equal 'This is the 1st post.'
    expect(post.user_id).to.equal user_id
    expect(post.parent_post_id).to.not.exist
    return
