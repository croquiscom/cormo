_g = require '../support/common'
{expect} = require 'chai'

_checkPost = (post, title, user_id, user_name, user_age) ->
  expect(post).to.not.be.an.instanceof _g.connection.Post
  expect(post).to.have.property 'title', title
  expect(post).to.have.property 'user'

  if user_id
    expect(post.user).to.not.be.an.instanceof _g.connection.User
    if user_age
      expect(post.user).to.have.keys 'id', 'name', 'age'
    else
      expect(post.user).to.have.keys 'id', 'name'
    expect(post.user).to.have.property 'id', user_id
    expect(post.user).to.have.property 'name', user_name
    if user_age
      expect(post.user).to.have.property 'age', user_age
  else
    expect(post.user).to.not.exist

_checkUser = (user, name, post_ids, post_titles, has_post_body) ->
  expect(user).to.not.be.an.instanceof _g.connection.User
  expect(user).to.have.property 'name', name
  expect(user).to.have.property 'posts'

  expect(user.posts).to.have.length post_ids.length
  for post, i in user.posts
    expect(post).to.not.be.an.instanceof _g.connection.Post
    if not has_post_body
      expect(post).to.have.keys 'id', 'user_id', 'title'
    else
      expect(post).to.have.keys 'id', 'user_id', 'title', 'body', 'parent_post_id'
    expect(post.id).to.equal post_ids[i]
    expect(post.title).to.equal post_titles[i]

module.exports = ->
  preset_users = undefined
  preset_posts = undefined

  beforeEach ->
    user1 = await _g.connection.User.create { name: 'John Doe', age: 27 }
    user2 = await _g.connection.User.create { name: 'Bill Smith', age: 45 }
    preset_users = [user1, user2]
    post1 = await _g.connection.Post.create { user_id: user1.id, title: 'first post', body: 'This is the 1st post.' }
    post2 = await _g.connection.Post.create { user_id: user1.id, title: 'second post', body: 'This is the 2st post.' }
    post3 = await _g.connection.Post.create { user_id: user2.id, title: 'another post', body: 'This is a post by user1.' }
    preset_posts = [post1, post2, post3]
    return

  it 'include objects that belong to', ->
    posts = await _g.connection.Post.query().lean().include('user')
    expect(posts).to.have.length 3
    _checkPost posts[0], 'first post', preset_users[0].id, 'John Doe', 27
    _checkPost posts[1], 'second post', preset_users[0].id, 'John Doe', 27
    _checkPost posts[2], 'another post', preset_users[1].id, 'Bill Smith', 45
    return

  it 'include an object that belongs to', ->
    post = await _g.connection.Post.find(preset_posts[0].id).lean().include('user')
    _checkPost post, 'first post', preset_users[0].id, 'John Doe', 27
    return

  it 'include objects that belong to with select', ->
    posts = await _g.connection.Post.query().lean().include('user', 'name')
    expect(posts).to.have.length 3
    _checkPost posts[0], 'first post', preset_users[0].id, 'John Doe'
    _checkPost posts[1], 'second post', preset_users[0].id, 'John Doe'
    _checkPost posts[2], 'another post', preset_users[1].id, 'Bill Smith'
    return

  it 'include objects that have many', ->
    users = await _g.connection.User.query().lean().include('posts')
    expect(users).to.have.length 2
    _checkUser users[0], 'John Doe', [preset_posts[0].id, preset_posts[1].id], ['first post', 'second post'], true
    _checkUser users[1], 'Bill Smith', [preset_posts[2].id], ['another post'], true
    return

  it 'include an object that has many', ->
    user = await _g.connection.User.find(preset_users[0].id).lean().include('posts')
    _checkUser user, 'John Doe', [preset_posts[0].id, preset_posts[1].id], ['first post', 'second post'], true
    return

  it 'include objects that have many with select', ->
    users = await _g.connection.User.query().lean().include('posts', 'title')
    expect(users).to.have.length 2
    _checkUser users[0], 'John Doe', [preset_posts[0].id, preset_posts[1].id], ['first post', 'second post'], false
    _checkUser users[1], 'Bill Smith', [preset_posts[2].id], ['another post'], false
    return

  it 'null id', ->
    await _g.connection.Post.find(preset_posts[1].id).update user_id: null
    posts = await _g.connection.Post.query().lean().include('user').order('id')
    expect(posts).to.have.length 3
    _checkPost posts[0], 'first post', preset_users[0].id, 'John Doe', 27
    _checkPost posts[1], 'second post', null
    _checkPost posts[2], 'another post', preset_users[1].id, 'Bill Smith', 45
    users = await _g.connection.User.query().lean().include('posts').order('id')
    expect(users).to.have.length 2
    _checkUser users[0], 'John Doe', [preset_posts[0].id], ['first post'], true
    _checkUser users[1], 'Bill Smith', [preset_posts[2].id], ['another post'], true
    return

  it 'invalid id', ->
    await _g.connection.User.find(preset_users[1].id).delete()
    posts = await _g.connection.Post.query().lean().include('user').order('id')
    expect(posts).to.have.length 3
    _checkPost posts[0], 'first post', preset_users[0].id, 'John Doe', 27
    _checkPost posts[1], 'second post', preset_users[0].id, 'John Doe', 27
    _checkPost posts[2], 'another post', null
    post = await _g.connection.Post.find(preset_posts[2].id).lean().include('user')
    _checkPost post, 'another post', null
    return

  it 'modify associated property (belongs to)', ->
    post = await _g.connection.Post.find(preset_posts[0].id).lean().include('user')
    post.user = 'other value'
    expect(post.user).to.be.equal 'other value'
    return

  it 'modify associated property (has many)', ->
    user = await _g.connection.User.find(preset_users[0].id).lean().include('posts')
    user.posts = 'other value'
    expect(user.posts).to.be.equal 'other value'
    return
