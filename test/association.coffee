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

      dropModels [User, Post], done

    beforeEach (done) ->
      deleteAllRecords [connection.User, connection.Post], done

    after (done) ->
      dropModels [connection.User, connection.Post], done

    describe '#hasMany', ->
      require('./cases/association_has_many')()
    describe '#belongsTo', ->
      require('./cases/association_belongs_to')()
    describe '#as', ->
      require('./cases/association_as')()
