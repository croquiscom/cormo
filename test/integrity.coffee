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
  describe 'integrity-' + db, ->
    before (done) ->
      _g.connection = new _g.Connection db, _dbs[db]

      done null

    beforeEach (done) ->
      class Team extends _g.Model
        @column 'name', String
      class Event extends _g.Model
        @column 'time', Date
      class Comment extends _g.Model
        @column 'content', String
      _g.dropModels [Comment, Event, Team], done

    after (done) ->
      _g.dropModels [_g.connection.Comment, _g.connection.Event, _g.connection.Team], done

    require('./cases/integrity')()
