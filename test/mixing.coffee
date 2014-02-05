require './common'

describe 'mixing several database', ->
  before (done) ->
    mysql = new _g.Connection 'mysql', _g.db_configs.mysql
    mongodb = new _g.Connection 'mongodb', _g.db_configs.mongodb

    if Math.floor Math.random() * 2
      # using CoffeeScript extends keyword
      class User extends _g.Model
        @connection mongodb
        @column 'name', String
        @column 'age', Number
        @hasMany 'posts', connection: mysql

      class Post extends _g.Model
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

    _g.connection =
      mysql: mysql
      mongodb: mongodb
      User: User
      Post: Post

    _g.dropModels [User, Post], done

  beforeEach (done) ->
    _g.deleteAllRecords [_g.connection.User, _g.connection.Post], done

  after (done) ->
    _g.dropModels [_g.connection.User, _g.connection.Post], ->
      _g.connection.mysql.close()
      _g.connection.mongodb.close()
      _g.connection = null
      done null

  describe '#hasMany', ->
    require('./cases/association_has_many')()
  describe '#belongsTo', ->
    require('./cases/association_belongs_to')()
  describe '#as', ->
    require('./cases/association_as')()
