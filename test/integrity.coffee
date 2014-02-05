require './common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  describe 'integrity-' + db, ->
    before (done) ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

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
      _g.dropModels [_g.connection.Comment, _g.connection.Event, _g.connection.Team], ->
        _g.connection.close()
        _g.connection = null
        done null

    require('./cases/integrity')()
