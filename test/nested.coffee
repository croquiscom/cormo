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
  describe 'nested-' + db, ->
    beforeEach (done) ->
      _g.connection = new _g.Connection db, _dbs[db]
      class User extends _g.Model
        @connection _g.connection
      _g.dropModels [User], done

    afterEach (done) ->
      _g.dropModels [_g.connection.User], ->
        _g.connection.close()
        _g.connection = null
        done null

    require('./cases/nested')()
