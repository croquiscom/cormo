_g = require './support/common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'manipulate-' + db, ->
    before ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      if _g.use_coffeescript_class
        class User extends _g.Model
          @column 'name', String
          @column 'age', Number
          @hasMany 'posts'

        class Post extends _g.Model
          @column 'title', String
          @column 'body', String
          @belongsTo 'user'
          @column 'readers', [_g.cormo.types.RecordID]
      else
        User = _g.connection.model 'User',
          name: String
          age: Number

        Post = _g.connection.model 'Post',
          title: String
          body: String
          readers: [_g.cormo.types.RecordID]

        User.hasMany Post
        Post.belongsTo User

      await _g.connection.dropAllModels()
      return

    beforeEach ->
      await _g.deleteAllRecords [_g.connection.User, _g.connection.Post]
      return

    after ->
      await _g.connection.dropAllModels()
      _g.connection.close()
      _g.connection = null
      return

    require('./cases/manipulate')()
