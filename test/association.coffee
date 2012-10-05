DBConnection = require('../index').DBConnection

_dbs =
  mysql:
    database: 'test'
  mongodb:
    database: 'test'

Object.keys(_dbs).forEach (db) ->
  describe 'association-' + db, ->
    connection = undefined
    connect = (callback) ->
      connection = new DBConnection db, _dbs[db]
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

        User = models.User = connection.model 'User',
          name: String
          age: Number

        Post = models.Post = connection.model 'Post',
          title: String
          body: String

        User.hasMany Post
        Post.belongsTo User

        User.drop (error) ->
          return done error if error
          Post.drop (error) ->
            return done error if error
            connection.applySchemas (error) ->
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

    require('./cases/association')(models)
