require './common'

_dbs =
  mysql:
    database: 'test'
  mongodb:
    database: 'test'
  sqlite3:
    database: __dirname + '/test.sqlite3'
  sqlite3_memory: {}
  postgresql:
    database: 'test'

Object.keys(_dbs).forEach (db) ->
  describe 'manipulate-' + db, ->
    before (done) ->
      _g.connection = new _g.Connection db, _dbs[db]

      if Math.floor Math.random() * 2
        # using CoffeeScript extends keyword
        class User extends _g.Model
          @column 'name', String
          @column 'age', Number
          @hasMany 'posts'

        class Post extends _g.Model
          @column 'title', String
          @column 'body', String
          @belongsTo 'user'
      else
        # using Connection method
        User = _g.connection.model 'User',
          name: String
          age: Number

        Post = _g.connection.model 'Post',
          title: String
          body: String

        User.hasMany Post
        Post.belongsTo User

      _g.dropModels [User, Post], done

    beforeEach (done) ->
      _g.deleteAllRecords [_g.connection.User, _g.connection.Post], done

    after (done) ->
      _g.dropModels [_g.connection.User, _g.connection.Post], done

    require('./cases/manipulate')()
