_compareUser = (archive, expected) ->
  archive.model.should.be.equal 'User'
  user = archive.data
  user.should.have.keys 'id', 'name', 'age'
  user.id.should.equal expected.id
  user.name.should.equal expected.name
  user.age.should.equal expected.age

module.exports = ->
  it 'basic', (done) ->
    users = undefined
    async.waterfall [
      (callback) ->
        connection.manipulate [
          { create_user: id: 'user0', name: 'John Doe', age: 27 }
          { create_user: id: 'user1', name: 'Bill Smith', age: 45 }
          { create_user: id: 'user2', name: 'Alice Jackson', age: 27 }
          { create_user: id: 'user3', name: 'Gina Baker', age: 32 }
          { create_user: id: 'user4', name: 'Daniel Smith', age: 8 }
        ], callback
      (id_to_record_map, callback) ->
        users = [0..4].map (i) -> id_to_record_map['user'+i]
        connection._Archive.where callback
      (records, callback) ->
        records.should.have.length 0
        connection.User.find(users[3].id).delete callback
      (count, callback) ->
        count.should.be.equal 1
        connection._Archive.where callback
      (records, callback) ->
        records.should.have.length 1
        _compareUser records[0], users[3]
        connection.User.delete age:27, callback
      (count, callback) ->
        count.should.be.equal 2
        connection._Archive.where callback
      (records, callback) ->
        records.should.have.length 3
        records.sort (a, b) -> if a.data.id < b.data.id then -1 else 1
        users.sort (a, b) -> if a.id < b.id then -1 else 1
        _compareUser records[0], users[0]
        _compareUser records[1], users[2]
        _compareUser records[2], users[3]
        callback null
    ], done
