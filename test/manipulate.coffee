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
    models = {}

    before (done) ->
      global.connection = new Connection db, _dbs[db]

      if Math.floor Math.random() * 2
        # using CoffeeScript extends keyword
        class User extends Model
          @column 'name', String
          @column 'age', Number
          @hasMany 'posts'

        class Post extends Model
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

      dropModels [models.User, models.Post], done

    beforeEach (done) ->
      deleteAllRecords [models.User, models.Post], done

    after (done) ->
      dropModels [models.User, models.Post], done

    require('./cases/manipulate')(models)
