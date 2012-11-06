require './common'

describe 'mixing several database', ->
  mysql = undefined
  mongodb = undefined
  connectMySQL = (callback) ->
    mysql = new Connection 'mysql', database: 'test'
    if mysql.connected
      callback()
    else
      mysql.once 'connected', callback
      mysql.once 'error', (error) ->
        callback error
  connectMongoDB = (callback) ->
    mongodb = new Connection 'mongodb', database: 'test'
    if mongodb.connected
      callback()
    else
      mongodb.once 'connected', callback
      mongodb.once 'error', (error) ->
        callback error

  models = {}

  before (done) ->
    async.parallel [
      (callback) -> connectMySQL callback
      (callback) -> connectMongoDB callback
    ], (error) ->
      return done error if error

      User = models.User = mongodb.model 'User',
        name: String
        age: Number

      Post = models.Post = mysql.model 'Post',
        title: String
        body: String

      User.hasMany Post
      Post.belongsTo User

      Post.hasMany Post, as: 'comments', foreign_key: 'parent_post_id'
      Post.belongsTo Post, as: 'parent_post'

      User.drop (error) ->
        return done error if error
        Post.drop (error) ->
          return done error if error
          async.parallel [
            (callback) -> mysql.applySchemas callback
            (callback) -> mongodb.applySchemas callback
          ], (error) ->
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
