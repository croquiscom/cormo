module.exports = ->
  preset_users = undefined
  preset_posts = undefined

  beforeEach (done) ->
    _g.connection.User.createBulk [
      { name: 'John Doe', age: 27 }
      { name: 'Bill Smith', age: 45 }
    ], (error, users) ->
      return done error if error
      preset_users = users
      _g.connection.Post.createBulk [
        { user_id: users[0].id, title: 'first post', body: 'This is the 1st post.' }
        { user_id: users[0].id, title: 'second post', body: 'This is the 2st post.' }
        { user_id: users[1].id, title: 'another post', body: 'This is a post by user1.' }
      ], (error, posts) ->
        return done error if error
        preset_posts = posts
        done null

  it 'include objects that belong to', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.Post.query().include('user').exec callback
      (posts, callback) ->
        posts.should.have.length 3

        posts[0].title.should.equal 'first post'
        posts[0].should.have.property 'user'
        posts[0].user.should.have.keys 'id', 'name', 'age'
        posts[0].user.id.should.equal preset_users[0].id
        posts[0].user.name.should.equal 'John Doe'

        posts[1].title.should.equal 'second post'
        posts[1].should.have.property 'user'
        posts[1].user.should.have.keys 'id', 'name', 'age'
        posts[1].user.id.should.equal preset_users[0].id
        posts[1].user.name.should.equal 'John Doe'

        posts[2].title.should.equal 'another post'
        posts[2].should.have.property 'user'
        posts[2].user.should.have.keys 'id', 'name', 'age'
        posts[2].user.id.should.equal preset_users[1].id
        posts[2].user.name.should.equal 'Bill Smith'

        callback null
    ], done

  it 'include an object that belongs to', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.Post.find(preset_posts[0].id).include('user').exec callback
      (post, callback) ->
        post.title.should.equal 'first post'
        post.should.have.property 'user'
        post.user.should.have.keys 'id', 'name', 'age'
        post.user.id.should.equal preset_users[0].id
        post.user.name.should.equal 'John Doe'

        callback null
    ], done

  it 'include objects that belong to with select', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.Post.query().include('user', 'name').exec callback
      (posts, callback) ->
        posts.should.have.length 3

        posts[0].title.should.equal 'first post'
        posts[0].should.have.property 'user'
        posts[0].user.should.have.keys 'id', 'name'
        posts[0].user.id.should.equal preset_users[0].id
        posts[0].user.name.should.equal 'John Doe'

        posts[1].title.should.equal 'second post'
        posts[1].should.have.property 'user'
        posts[1].user.should.have.keys 'id', 'name'
        posts[1].user.id.should.equal preset_users[0].id
        posts[1].user.name.should.equal 'John Doe'

        posts[2].title.should.equal 'another post'
        posts[2].should.have.property 'user'
        posts[2].user.should.have.keys 'id', 'name'
        posts[2].user.id.should.equal preset_users[1].id
        posts[2].user.name.should.equal 'Bill Smith'

        callback null
    ], done

  it 'include objects that have many', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.User.query().include('posts').exec callback
      (users, callback) ->
        users.should.have.length 2

        users[0].name.should.equal 'John Doe'
        users[0].should.have.property 'posts'
        users[0].posts.should.have.length 2
        if _g.connection.User.eliminate_null
          users[0].posts[0].should.have.keys 'id', 'user_id', 'title', 'body'
        else
          users[0].posts[0].should.have.keys 'id', 'user_id', 'title', 'body', 'parent_post_id'
        users[0].posts[0].id.should.equal preset_posts[0].id
        users[0].posts[0].title.should.equal 'first post'
        if _g.connection.User.eliminate_null
          users[0].posts[1].should.have.keys 'id', 'user_id', 'title', 'body'
        else
          users[0].posts[1].should.have.keys 'id', 'user_id', 'title', 'body', 'parent_post_id'
        users[0].posts[1].id.should.equal preset_posts[1].id
        users[0].posts[1].title.should.equal 'second post'

        users[1].name.should.equal 'Bill Smith'
        users[1].posts.should.have.length 1
        if _g.connection.User.eliminate_null
          users[1].posts[0].should.have.keys 'id', 'user_id', 'title', 'body'
        else
          users[1].posts[0].should.have.keys 'id', 'user_id', 'title', 'body', 'parent_post_id'
        users[1].posts[0].id.should.equal preset_posts[2].id
        users[1].posts[0].title.should.equal 'another post'

        callback null
    ], done

  it 'include an object that has many', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.User.find(preset_users[0].id).include('posts').exec callback
      (user, callback) ->
        user.name.should.equal 'John Doe'
        user.should.have.property 'posts'
        user.posts.should.have.length 2
        if _g.connection.User.eliminate_null
          user.posts[0].should.have.keys 'id', 'user_id', 'title', 'body'
        else
          user.posts[0].should.have.keys 'id', 'user_id', 'title', 'body', 'parent_post_id'
        user.posts[0].id.should.equal preset_posts[0].id
        user.posts[0].title.should.equal 'first post'
        if _g.connection.User.eliminate_null
          user.posts[1].should.have.keys 'id', 'user_id', 'title', 'body'
        else
          user.posts[1].should.have.keys 'id', 'user_id', 'title', 'body', 'parent_post_id'
        user.posts[1].id.should.equal preset_posts[1].id
        user.posts[1].title.should.equal 'second post'

        callback null
    ], done

  it 'include objects that have many with select', (done) ->
    _g.async.waterfall [
      (callback) ->
        _g.connection.User.query().include('posts', 'title').exec callback
      (users, callback) ->
        users.should.have.length 2

        users[0].name.should.equal 'John Doe'
        users[0].should.have.property 'posts'
        users[0].posts.should.have.length 2
        users[0].posts[0].should.have.keys 'id', 'user_id', 'title'
        users[0].posts[0].id.should.equal preset_posts[0].id
        users[0].posts[0].title.should.equal 'first post'
        users[0].posts[1].should.have.keys 'id', 'user_id', 'title'
        users[0].posts[1].id.should.equal preset_posts[1].id
        users[0].posts[1].title.should.equal 'second post'

        users[1].name.should.equal 'Bill Smith'
        users[1].posts.should.have.length 1
        users[1].posts[0].should.have.keys 'id', 'user_id', 'title'
        users[1].posts[0].id.should.equal preset_posts[2].id
        users[1].posts[0].title.should.equal 'another post'

        callback null
    ], done
