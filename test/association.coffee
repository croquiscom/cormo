_g = require './common'

_dbs = [ 'mysql', 'mongodb', 'sqlite3', 'sqlite3_memory', 'postgresql' ]

_dbs.forEach (db) ->
  return if not _g.db_configs[db]
  describe 'association-' + db, ->
    before (done) ->
      _g.connection = new _g.Connection db, _g.db_configs[db]

      if _g.use_coffeescript_class
        class User extends _g.Model
          @column 'name', String
          @column 'age', Number
          @hasMany 'posts'
          @hasOne 'computer'

        class Post extends _g.Model
          @column 'title', String
          @column 'body', String
          @belongsTo 'user'
          @hasMany 'comments', type: 'Post', foreign_key: 'parent_post_id'
          @belongsTo 'parent_post', type: 'Post'

        class Computer extends _g.Model
          @column 'brand', String
          @belongsTo 'user'
      else
        User = _g.connection.model 'User',
          name: String
          age: Number

        Post = _g.connection.model 'Post',
          title: String
          body: String

        Computer = _g.connection.model 'Computer',
          brand: String

        User.hasMany Post
        Post.belongsTo User

        Post.hasMany Post, as: 'comments', foreign_key: 'parent_post_id'
        Post.belongsTo Post, as: 'parent_post'

        User.hasOne Computer
        Computer.belongsTo User

      _g.connection.dropAllModels done

    beforeEach (done) ->
      _g.deleteAllRecords [_g.connection.User, _g.connection.Post, _g.connection.Computer], done

    after (done) ->
      _g.connection.dropAllModels ->
        _g.connection.close()
        _g.connection = null
        done null

    describe '#hasMany', ->
      require('./cases/association_has_many')()
    describe '#hasOne', ->
      require('./cases/association_has_one')()
    describe '#belongsTo', ->
      require('./cases/association_belongs_to')()
    describe '#as', ->
      require('./cases/association_as')()
    describe '#fetch', ->
      require('./cases/association_fetch')()
    describe '#include', ->
      require('./cases/association_include')()
    describe '#include with lean', ->
      require('./cases/association_include_lean')()
