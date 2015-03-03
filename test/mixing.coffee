_g = require './common'

return if not _g.db_configs['mysql'] or not _g.db_configs['mongodb']
describe 'mixing several database', ->
  before (done) ->
    mysql = new _g.Connection 'mysql', _g.db_configs.mysql
    mongodb = new _g.Connection 'mongodb', _g.db_configs.mongodb

    if _g.use_coffeescript_class
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
      applySchemas: (callback) ->
        mysql.applySchemas (error) ->
          return callback error if error
          mongodb.applySchemas callback

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
