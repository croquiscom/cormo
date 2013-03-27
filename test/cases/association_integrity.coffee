module.exports = ->
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

  it 'ignore', (done) ->
    _g.connection.Team.hasMany _g.connection.Event
    _g.connection.Event.belongsTo _g.connection.Team

    team0_id = undefined
    event0_id = undefined

    _g.async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_team: id: 'team0', name: 'Croquis' }
          { create_event: id: 'event0', team_id: 'team0' }
          { create_event: id: 'event1', team_id: 'team0' }
        ], callback
      (id_to_record_map, callback) ->
        team0_id = id_to_record_map.team0.id
        event0_id = id_to_record_map.event0.id
        _g.connection.Team.find(team0_id).delete callback
      (count, callback) ->
        count.should.be.equal 1
        _g.connection.Event.find event0_id, callback
      (event0, callback) ->
        event0.id.should.be.equal event0_id
        event0.team_id.should.be.equal team0_id
        callback null
    ], done

  it 'nullify', (done) ->
    _g.connection.Team.hasMany _g.connection.Event, integrity: 'nullify'
    _g.connection.Event.belongsTo _g.connection.Team

    team0_id = undefined
    event0_id = undefined

    _g.async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_team: id: 'team0', name: 'Croquis' }
          { create_event: id: 'event0', team_id: 'team0' }
          { create_event: id: 'event1', team_id: 'team0' }
        ], callback
      (id_to_record_map, callback) ->
        team0_id = id_to_record_map.team0.id
        event0_id = id_to_record_map.event0.id
        _g.connection.Team.find(team0_id).delete callback
      (count, callback) ->
        count.should.be.equal 1
        _g.connection.Event.find event0_id, callback
      (event0, callback) ->
        event0.id.should.be.equal event0_id
        should.not.exist event0.team_id
        callback null
    ], done

  it 'restrict', (done) ->
    _g.connection.Team.hasMany _g.connection.Event, integrity: 'restrict'
    _g.connection.Event.belongsTo _g.connection.Team

    team0_id = undefined

    _g.async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_team: id: 'team0', name: 'Croquis' }
          { create_event: id: 'event0', team_id: 'team0' }
          { create_event: id: 'event1', team_id: 'team0' }
        ], callback
      # try to delete but must fail
      (id_to_record_map, callback) ->
        team0_id = id_to_record_map.team0.id
        _g.connection.Team.find(team0_id).delete (error) ->
          should.exist error
          error.message.should.be.equal 'rejected'
          callback null
      # not deleted
      (callback) ->
        _g.connection.Team.find team0_id, callback
      (team, callback) ->
        team.name.should.be.equal 'Croquis'
        callback null
      # make no dependent records
      (callback) ->
        _g.connection.Event.delete callback
      # can delete
      (count, callback) ->
        _g.connection.Team.find(team0_id).delete callback
      (count, callback) ->
        count.should.be.equal 1
        callback null
    ], done

  it 'delete', (done) ->
    _g.connection.Team.hasMany _g.connection.Event, integrity: 'delete'
    _g.connection.Event.belongsTo _g.connection.Team

    _g.connection.Comment.belongsTo _g.connection.Event
    _g.connection.Event.hasMany _g.connection.Comment, integrity: 'delete'

    team0_id = undefined
    event1_id = undefined

    _g.async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_team: id: 'team0', name: 'Croquis' }
          { create_team: id: 'team1', name: 'Croquis' }
          { create_event: id: 'event0', team_id: 'team0' }
          { create_event: id: 'event1', team_id: 'team0' }
          { create_event: id: 'event2', team_id: 'team1' }
          { create_event: id: 'event3', team_id: 'team1' }
          { create_comment: event_id: 'event0', content: 'First comment of event0' }
          { create_comment: event_id: 'event0', content: 'Second comment of event0' }
          { create_comment: event_id: 'event2', content: 'First comment of event2' }
        ], callback
      (id_to_record_map, callback) ->
        team0_id = id_to_record_map.team0.id
        event1_id = id_to_record_map.event1.id
        _g.connection.Team.find(team0_id).delete callback
      (count, callback) ->
        count.should.be.equal 1
        _g.connection.Event.find event1_id, (error) ->
          should.exist error
          error.message.should.be.equal 'not found'
          callback null
      (callback) ->
        _g.connection.Comment.where callback
      (records, callback) ->
        records.should.have.length 1
        records[0].content.should.be.equal 'First comment of event2'
        callback null
    ], done

  it 'nullfy by delete', (done) ->
    _g.connection.Team.hasMany _g.connection.Event, integrity: 'delete'
    _g.connection.Event.belongsTo _g.connection.Team

    _g.connection.Comment.belongsTo _g.connection.Event
    _g.connection.Event.hasMany _g.connection.Comment, integrity: 'nullify'

    team0_id = undefined
    event0_id = undefined
    comment0_id = undefined

    _g.async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_team: id: 'team0', name: 'Croquis' }
          { create_team: id: 'team1', name: 'Croquis' }
          { create_event: id: 'event0', team_id: 'team0' }
          { create_event: id: 'event1', team_id: 'team0' }
          { create_event: id: 'event2', team_id: 'team1' }
          { create_event: id: 'event3', team_id: 'team1' }
          { create_comment: id: 'comment0', event_id: 'event0', content: 'First comment of event0' }
          { create_comment: event_id: 'event0', content: 'Second comment of event0' }
          { create_comment: event_id: 'event2', content: 'First comment of event2' }
        ], callback
      (id_to_record_map, callback) ->
        team0_id = id_to_record_map.team0.id
        event0_id = id_to_record_map.event0.id
        comment0_id = id_to_record_map.comment0.id
        _g.connection.Team.find(team0_id).delete callback
      (count, callback) ->
        count.should.be.equal 1
        _g.connection.Event.find event0_id, (error) ->
          should.exist error
          error.message.should.be.equal 'not found'
          callback null
      (callback) ->
        _g.connection.Comment.find comment0_id, callback
      (comment, callback) ->
        comment.content.should.be.equal 'First comment of event0'
        should.not.exist comment.event_id
        callback null
    ], done

  it 'get inconsistencies', (done) ->
    events = undefined
    comments = undefined

    _g.connection.Team.hasMany _g.connection.Event
    _g.connection.Event.belongsTo _g.connection.Team

    _g.connection.Comment.belongsTo _g.connection.Event
    _g.connection.Event.hasMany _g.connection.Comment

    _g.async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_team: id: 'team0', name: 'Croquis' }
          { create_team: id: 'team1', name: 'Croquis' }
          { create_event: id: 'event0', team_id: 'team0' }
          { create_event: id: 'event1', team_id: 'team0' }
          { create_event: id: 'event2', team_id: 'team1' }
          { create_event: id: 'event3', team_id: 'team1' }
          { create_comment: id: 'comment0', event_id: 'event0', content: 'First comment of event0' }
          { create_comment: id: 'comment1', event_id: 'event0', content: 'Second comment of event0' }
          { create_comment: id: 'comment2', event_id: 'event2', content: 'First comment of event2' }
        ], callback
      (id_to_record_map, callback) ->
        events = [0..1].map (i) -> id_to_record_map['event'+i]
        comments = [2..2].map (i) -> id_to_record_map['comment'+i]
        _g.connection.Team.find(id_to_record_map.team0.id).delete (error, count) ->
          _g.connection.Event.find(id_to_record_map.event2.id).delete (error, count) ->
            callback error
      (callback) ->
        _g.connection.getInconsistencies callback
      (inconsistencies, callback) ->
        inconsistencies.should.have.keys 'Event', 'Comment'

        inconsistencies.Event.should.have.length 2
        inconsistencies.Event.sort (a, b) -> if a < b then -1 else 1
        events.sort (a, b) -> if a.id < b.id then -1 else 1
        inconsistencies.Event[0].should.be.equal events[0].id
        inconsistencies.Event[1].should.be.equal events[1].id

        inconsistencies.Comment.should.have.length 1
        inconsistencies.Comment[0].should.be.equal comments[0].id

        callback null
    ], done

  it 'get inconsistencies (exclude null)', (done) ->
    comments = undefined

    _g.connection.Team.hasMany _g.connection.Event, integrity: 'nullify'
    _g.connection.Event.belongsTo _g.connection.Team

    _g.connection.Comment.belongsTo _g.connection.Event
    _g.connection.Event.hasMany _g.connection.Comment

    _g.async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_team: id: 'team0', name: 'Croquis' }
          { create_team: id: 'team1', name: 'Croquis' }
          { create_event: id: 'event0', team_id: 'team0' }
          { create_event: id: 'event1', team_id: 'team0' }
          { create_event: id: 'event2', team_id: 'team1' }
          { create_event: id: 'event3', team_id: 'team1' }
          { create_comment: id: 'comment0', event_id: 'event0', content: 'First comment of event0' }
          { create_comment: id: 'comment1', event_id: 'event0', content: 'Second comment of event0' }
          { create_comment: id: 'comment2', event_id: 'event2', content: 'First comment of event2' }
        ], callback
      (id_to_record_map, callback) ->
        comments = [2..2].map (i) -> id_to_record_map['comment'+i]
        _g.connection.Team.find(id_to_record_map.team0.id).delete (error, count) ->
          _g.connection.Event.find(id_to_record_map.event2.id).delete (error, count) ->
            callback error
      (callback) ->
        _g.connection.getInconsistencies callback
      (inconsistencies, callback) ->
        inconsistencies.should.have.keys 'Comment'

        inconsistencies.Comment.should.have.length 1
        inconsistencies.Comment[0].should.be.equal comments[0].id

        callback null
    ], done
