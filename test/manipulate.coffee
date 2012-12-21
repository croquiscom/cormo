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
    connection = new Connection db, _dbs[db]
    connect = (callback) ->
      if connection.connected
        callback()
      else
        connection.once 'connected', callback
        connection.once 'error', (error) ->
          callback error

    models = {}

    before (done) ->
      connect (error) ->
        return done error if error

        if Math.floor Math.random() * 2
          # using CoffeeScript extends keyword
          class User extends Model
            @connection connection
            @column 'name', String
            @column 'age', Number
            @hasMany 'posts'

          class Post extends Model
            @connection connection
            @column 'title', String
            @column 'body', String
            @belongsTo 'user'
        else
          # using Connection method
          User = connection.model 'User',
            name: String
            age: Number

          Post = connection.model 'Post',
            title: String
            body: String

          User.hasMany Post
          Post.belongsTo User

        models.User = User
        models.Post = Post

        User.drop (error) ->
          return done error if error
          Post.drop (error) ->
            return done error if error
            done null

    beforeEach (done) ->
      models.User.deleteAll (error) ->
        return done error if error
        models.Post.deleteAll (error) ->
          return done error if error
          done null

    after (done) ->
      models.User.drop (error) ->
        models.Post.drop (error) ->
          done null

    require('./cases/manipulate')(connection, models)
