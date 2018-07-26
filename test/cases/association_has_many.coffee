_g = require '../support/common'
{expect} = require 'chai'

_comparePost = (a, b) ->
  expect(a).to.have.property 'user_id', b.user_id
  expect(a).to.have.property 'title', b.title
  expect(a).to.have.property 'body', b.body

module.exports = () ->
  it 'collection_accessor.build on a new object', ->
    # create two new objects
    user1 = _g.connection.User.build name: 'John Doe', age: 27
    expect(user1.posts).to.exist
    user2 = _g.connection.User.build name: 'Bill Smith', age: 45
    expect(user2.posts).to.exist
    # check default status
    posts = await user1.posts()
    expect(posts).to.have.length 0
    posts = await user2.posts (error, posts) ->
    expect(posts).to.have.length 0
    # call build method and check status
    posts1 = user1.posts
    posts2 = user2.posts
    posts1.build title: 'first post', body: 'This is the 1st post.'
    posts1.build title: 'second post', body: 'This is the 2nd post.'
    posts2.build title: 'third post', body: 'This is the 3rd post.'
    posts = await posts1()
    expect(posts).to.have.length 2
    expect(posts[0].user_id).to.not.exist
    expect(posts[0]).to.have.property 'title', 'first post'
    expect(posts[1].user_id).to.not.exist
    expect(posts[1]).to.have.property 'title', 'second post'
    posts = await posts2()
    expect(posts).to.have.length 1
    expect(posts[0].user_id).to.not.exist
    expect(posts[0]).to.have.property 'title', 'third post'
    return

  it 'collection_accessor.build on an existing object', ->
    # create two new objects
    user1 = await _g.connection.User.create { name: 'John Doe', age: 27 }
    expect(user1.posts).to.exist
    user2 = await _g.connection.User.create { name: 'Bill Smith', age: 45 }
    expect(user2.posts).to.exist
    # check default status
    posts = await user1.posts()
    expect(posts).to.have.length 0
    posts = await user2.posts()
    expect(posts).to.have.length 0
    # call build method and check status
    posts1 = user1.posts
    posts2 = user2.posts
    posts1.build title: 'first post', body: 'This is the 1st post.'
    posts1.build title: 'second post', body: 'This is the 2nd post.'
    posts2.build title: 'third post', body: 'This is the 3rd post.'
    posts = await posts1()
    expect(posts).to.have.length 2
    expect(posts[0]).to.have.property 'user_id', user1.id
    expect(posts[0]).to.have.property 'title', 'first post'
    expect(posts[1]).to.have.property 'user_id', user1.id
    expect(posts[1]).to.have.property 'title', 'second post'
    posts = await posts2()
    expect(posts).to.have.length 1
    expect(posts[0]).to.have.property 'user_id', user2.id
    expect(posts[0]).to.have.property 'title', 'third post'
    return

  it 'save object after creating a sub object', ->
    user = _g.connection.User.build name: 'John Doe', age: 27
    post = user.posts.build title: 'first post', body: 'This is the 1st post.'
    expect(user.id).to.not.exist
    expect(post.id).to.not.exist
    expect(post.user_id).to.not.exist
    await user.save()
    expect(user).to.have.property 'id'
    expect(post).to.have.property 'id'
    expect(post).to.have.property 'user_id', user.id
    return

  it 'get sub objects', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    post1 = await _g.connection.Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }
    post2 = await _g.connection.Post.create { title: 'second post', body: 'This is the 2nd post.', user_id: user.id }
    posts = await user.posts()
    expect(posts).to.have.length 2
    posts.sort (a, b) -> if a.body < b.body then -1 else 1
    _comparePost posts[0], post1
    _comparePost posts[1], post2
    return

  it 'sub objects are cached', ->
    user = await _g.connection.User.create { name: 'John Doe', age: 27 }
    post1 = await _g.connection.Post.create { title: 'first post', body: 'This is the 1st post.', user_id: user.id }
    posts = await user.posts()
    expect(posts).to.have.length 1
    _comparePost posts[0], post1
    post2 = await _g.connection.Post.create { title: 'second post', body: 'This is the 2nd post.', user_id: user.id }
    posts = await user.posts()
    # added object is not fetched
    expect(posts).to.have.length 1
    _comparePost posts[0], post1
    # ignore cache and force reload
    posts = await user.posts true
    expect(posts).to.have.length 2
    posts.sort (a, b) -> if a.body < b.body then -1 else 1
    _comparePost posts[0], post1
    _comparePost posts[1], post2
    return
