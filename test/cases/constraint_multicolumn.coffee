module.exports = (models) ->
  it 'unique', (done) ->
    models.Version.create major: 1, minor: 1, (error, version) ->
      return done error if error
      models.Version.create major: 1, minor: 1, (error, version) ->
        should.exist error
        done null

  it 'each can duplicate', (done) ->
    models.Version.create major: 1, minor: 1, (error, version) ->
      return done error if error
      models.Version.create major: 1, minor: 2, (error, version) ->
        return done error if error
        done null

  it 'can have two null records', (done) ->
    models.Version.create {}, (error, version) ->
      return done error if error
      models.Version.create {}, (error, version) ->
        return done error if error
        done null
