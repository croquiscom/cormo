require './common'

describe 'mixing several database', ->
  before (done) ->
    global.connection = {}
    mysql = new Connection 'mysql', database: 'test'
    mongodb = new Connection 'mongodb', database: 'test'

    if Math.floor Math.random() * 2
      # using CoffeeScript extends keyword
      class User extends Model
        @connection mongodb
        @column 'name', String
        @column 'age', Number
        @hasMany 'posts', connection: mysql

      class Post extends Model
        @connection mysql
        @column 'title', String
        @column 'body', String
        @belongsTo 'user', connection: mongodb
        @hasMany 'comments', type: 'Post', foreign_key: 'parent_post_id'
        @belongsTo 'parent_post', type: 'Post'
    else
      # using Connection method
      User = mongodb.model 'User',
        name: String
        age: Number

      Post = mysql.model 'Post',
        title: String
        body: String

      User.hasMany Post
      Post.belongsTo User

      Post.hasMany Post, as: 'comments', foreign_key: 'parent_post_id'
      Post.belongsTo Post, as: 'parent_post'

    connection.User = User
    connection.Post = Post

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
