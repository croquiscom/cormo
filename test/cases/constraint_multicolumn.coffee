module.exports = () ->
  it 'unique', (done) ->
    connection.Version.create major: 1, minor: 1, (error, version) ->
      return done error if error
      connection.Version.create major: 1, minor: 1, (error, version) ->
        # 'duplicated email' or 'duplicated'
        error.message.should.match /^duplicated( major_minor)?$/
        should.exist error
        done null

  it 'each can duplicate', (done) ->
    connection.Version.create major: 1, minor: 1, (error, version) ->
      return done error if error
      connection.Version.create major: 1, minor: 2, (error, version) ->
        return done error if error
        done null

  it 'can have two null records', (done) ->
    connection.Version.create {}, (error, version) ->
      return done error if error
      connection.Version.create {}, (error, version) ->
        return done error if error
        done null
