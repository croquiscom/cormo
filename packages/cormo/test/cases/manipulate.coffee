_g = require '../support/common'
{expect} = require 'chai'

_compareUser = (user, expected) ->
  expect(user).to.have.keys 'id', 'name', 'age'
  expect(user.name).to.equal expected.name
  expect(user.age).to.equal expected.age

module.exports = () ->
  it 'create simple', ->
    count = await _g.connection.User.count()
    expect(count).to.equal 0
    await _g.connection.manipulate { create_user: name: 'John Doe', age: 27 }
    count = await _g.connection.User.count()
    users = await _g.connection.User.where()
    expect(users).to.have.length 1
    expect(users[0]).to.have.keys 'id', 'name', 'age'
    expect(users[0].name).to.equal 'John Doe'
    expect(users[0].age).to.equal 27
    return

  it 'invalid model', ->
    try
      await _g.connection.manipulate { create_account: name: 'John Doe', age: 27 }
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error).to.be.an.instanceof Error
      expect(error.message).to.equal 'model Account does not exist'
    return

  it 'create multiple', ->
    await _g.connection.manipulate [
      { create_user: name: 'John Doe', age: 27 }
      { create_user: name: 'Bill Smith', age: 45 }
      { create_user: name: 'Alice Jackson', age: 27 }
    ]
    count = await _g.connection.User.count()
    expect(count).to.equal 3
    return

  it 'delete all', ->
    await _g.connection.manipulate [
      { create_user: name: 'John Doe', age: 27 }
      { create_user: name: 'Bill Smith', age: 45 }
      { create_user: name: 'Alice Jackson', age: 27 }
    ]
    await _g.connection.manipulate 'delete_user'
    count = await _g.connection.User.count()
    expect(count).to.equal 0
    return

  it 'delete some', ->
    await _g.connection.manipulate [
      { create_user: name: 'John Doe', age: 27 }
      { create_user: name: 'Bill Smith', age: 45 }
      { create_user: name: 'Alice Jackson', age: 27 }
    ]
    await _g.connection.manipulate { delete_user: age: 27 }
    count = await _g.connection.User.count()
    expect(count).to.equal 1
    users = await _g.connection.User.where()
    expect(users).to.have.length 1
    expect(users[0]).to.have.keys 'id', 'name', 'age'
    expect(users[0].name).to.equal 'Bill Smith'
    expect(users[0].age).to.equal 45
    return

  it 'build association', ->
    await _g.connection.manipulate [
      { create_user: id: 'user1', name: 'John Doe', age: 27 }
      { create_post: title: 'first post', body: 'This is the 1st post.', user_id: 'user1' }
    ]
    users = await _g.connection.User.where()
    posts = await _g.connection.Post.where()
    expect(users).to.have.length 1
    expect(posts).to.have.length 1
    expect(posts[0].user_id).to.equal users[0].id
    return

  it 'build association by real id', ->
    id_to_record_map = await _g.connection.manipulate [
      { create_user: id: 'user1', name: 'John Doe', age: 27 }
    ]
    await _g.connection.manipulate [
      { create_post: title: 'first post', body: 'This is the 1st post.', user_id: id_to_record_map.user1.id }
    ]
    users = await _g.connection.User.where()
    posts = await _g.connection.Post.where()
    expect(users).to.have.length 1
    expect(posts).to.have.length 1
    expect(posts[0].user_id).to.equal users[0].id
    return

  it 'id is not shared between manipulates', ->
    await _g.connection.manipulate [
      { create_user: id: 'user1', name: 'John Doe', age: 27 }
    ]
    try
      await _g.connection.manipulate [
        { create_post: title: 'first post', body: 'This is the 1st post.', user_id: 'user1' }
      ]
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error).to.be.an.instanceof Error
    return

  it 'deleteAll', ->
    await _g.connection.manipulate [
      { create_user: name: 'John Doe', age: 27 }
      { create_post: title: 'first post', body: 'This is the 1st post.' }
    ]
    count = await _g.connection.User.count()
    expect(count).to.equal 1
    count = await _g.connection.Post.count()
    expect(count).to.equal 1

    await _g.connection.manipulate 'deleteAll'
    count = await _g.connection.User.count()
    expect(count).to.equal 0
    count = await _g.connection.Post.count()
    expect(count).to.equal 0
    return

  it 'find record', ->
    await _g.connection.manipulate [
      { create_user: name: 'John Doe', age: 27 }
      { create_user: name: 'Bill Smith', age: 45 }
      { create_user: name: 'Alice Jackson', age: 27 }
    ]
    id_to_record_map = await _g.connection.manipulate [
      { find_users: id: 'users', age: 27 }
    ]
    users = id_to_record_map.users
    expect(users).to.be.an.instanceof Array
    expect(users).to.have.length 2
    users.sort (a, b) -> if a.name < b.name then -1 else 1
    _compareUser users[0], name: 'Alice Jackson', age: 27
    _compareUser users[1], name: 'John Doe', age: 27
    return

  it 'build array column', ->
    id_to_record_map = await _g.connection.manipulate [
      { create_user: id: 'user1', name: 'John Doe', age: 27 }
      { create_user: id: 'user2', name: 'Bill Smith', age: 45 }
      { create_user: id: 'user3', name: 'Alice Jackson', age: 27 }
      { create_post: title: 'first post', body: 'This is the 1st post.', user_id: 'user1', readers: ['user2', 'user3'] }
    ]
    users = [id_to_record_map.user1, id_to_record_map.user2, id_to_record_map.user3]
    posts = await _g.connection.Post.where()
    expect(users).to.have.length 3
    expect(posts).to.have.length 1
    expect(posts[0].user_id).to.equal users[0].id
    expect(posts[0].readers).to.eql [users[1].id, users[2].id]
    return
