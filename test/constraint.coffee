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
  describe 'constraint-' + db, ->
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
            @column 'name', { type: String, required: true }
            @column 'age', { type: Number, required: true }
            @column 'email', { type: String, unique: true, required: true }
            @column 'facebook_id', { type: String, unique: true }
        else
          # using Connection method
          User = connection.model 'User',
            name: { type: String, required: true }
            age: { type: Number, required: true }
            email: { type: String, unique: true, required: true }
            facebook_id: { type: String, unique: true }

        models.User = User

        User.drop (error) ->
          return done error if error
          done null

    beforeEach (done) ->
      models.User.deleteAll (error) ->
        return done error if error
        done null

    after (done) ->
      models.User.drop done

    require('./cases/constraint')(models)
