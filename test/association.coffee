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
  describe 'association-' + db, ->
    connection = undefined
    connect = (callback) ->
      connection = new Connection db, _dbs[db]
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
            @hasMany 'comments', type: 'Post', foreign_key: 'parent_post_id'
            @belongsTo 'parent_post', type: 'Post'
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

          Post.hasMany Post, as: 'comments', foreign_key: 'parent_post_id'
          Post.belongsTo Post, as: 'parent_post'

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

    describe '#hasMany', ->
      require('./cases/association_has_many')(models)
    describe '#belongsTo', ->
      require('./cases/association_belongs_to')(models)
    describe '#as', ->
      require('./cases/association_as')(models)
