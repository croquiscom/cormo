_g = require './support/common'

return if not _g.db_configs['mysql'] or not _g.db_configs['mongodb']
describe 'mixing several database', ->
  before ->
    mysql = new _g.Connection 'mysql', _g.db_configs.mysql
    mongodb = new _g.Connection 'mongodb', _g.db_configs.mongodb

    if _g.use_class
      class User extends _g.BaseModel
        @connection mongodb
        @column 'name', String
        @column 'age', Number
        @hasMany 'posts', connection: mysql

      class Post extends _g.BaseModel
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
      applySchemas: ->
        await mysql.applySchemas()
        await mongodb.applySchemas()
        return
      dropAllModels: ->
        await mysql.dropAllModels()
        await mongodb.dropAllModels()
        return

    await _g.connection.dropAllModels()
    return

  beforeEach ->
    await _g.deleteAllRecords [_g.connection.User, _g.connection.Post]
    return

  after ->
    await _g.connection.dropAllModels()
    _g.connection.mysql.close()
    _g.connection.mongodb.close()
    _g.connection = null
    return

  describe '#hasMany', ->
    require('./cases/association_has_many')()
  describe '#belongsTo', ->
    require('./cases/association_belongs_to')()
  describe '#as', ->
    require('./cases/association_as')()
