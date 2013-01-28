require './common'

describe 'mixing several database', ->
  models = {}

  before (done) ->
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

    models.User = User
    models.Post = Post

    dropModels [models.User, models.Post], done

  beforeEach (done) ->
    deleteAllRecords [models.User, models.Post], done

  after (done) ->
    dropModels [models.User, models.Post], done

  describe '#hasMany', ->
    require('./cases/association_has_many')(models)
  describe '#belongsTo', ->
    require('./cases/association_belongs_to')(models)
  describe '#as', ->
    require('./cases/association_as')(models)
