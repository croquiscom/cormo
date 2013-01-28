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
  redis:
    database: 1

Object.keys(_dbs).forEach (db) ->
  describe 'connect-' + db, ->
    before (done) ->
      global.connection = new Connection db, _dbs[db]
      User = connection.model 'User',
        name: String
        age: Number
      User.drop (error) ->
        done null

    it 'can process without waiting connected and schemas applied', (done) ->
      global.connection = new Connection db, _dbs[db]
      User = connection.model 'User',
        name: String
        age: Number

      User.create { name: 'John Doe', age: 27 }, (error, user) ->
        return done error if error
        User.find user.id, (error, record) ->
          return done error if error
          should.exist record
          record.should.be.an.instanceOf User
          record.should.have.property 'id', user.id
          record.should.have.property 'name', user.name
          record.should.have.property 'age', user.age
          done null
