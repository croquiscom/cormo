module.exports = ->
  beforeEach (done) ->
    class Team extends Model
      @column 'name', String
    class Event extends Model
      @column 'time', Date
    class Comment extends Model
      @column 'content', String
    dropModels [Comment, Event, Team], done

  after (done) ->
    dropModels [connection.Comment, connection.Event, connection.Team], done

  it 'ignore', (done) ->
    connection.Team.hasMany connection.Event
    connection.Event.belongsTo connection.Team

    team0_id = undefined
    event0_id = undefined

    async.waterfall [
      (callback) ->
        connection.manipulate [
          { create_team: id: 'team0', name: 'Croquis' }
          { create_event: id: 'event0', team_id: 'team0' }
          { create_event: id: 'event1', team_id: 'team0' }
        ], callback
      (id_to_record_map, callback) ->
        team0_id = id_to_record_map.team0.id
        event0_id = id_to_record_map.event0.id
        connection.Team.find(team0_id).delete callback
      (count, callback) ->
        count.should.be.equal 1
        connection.Event.find event0_id, callback
      (event0, callback) ->
        event0.id.should.be.equal event0_id
        event0.team_id.should.be.equal team0_id
        callback null
    ], done

  it 'nullify', (done) ->
    connection.Team.hasMany connection.Event, integrity: 'nullify'
    connection.Event.belongsTo connection.Team

    team0_id = undefined
    event0_id = undefined

    async.waterfall [
      (callback) ->
        connection.manipulate [
          { create_team: id: 'team0', name: 'Croquis' }
          { create_event: id: 'event0', team_id: 'team0' }
          { create_event: id: 'event1', team_id: 'team0' }
        ], callback
      (id_to_record_map, callback) ->
        team0_id = id_to_record_map.team0.id
        event0_id = id_to_record_map.event0.id
        connection.Team.find(team0_id).delete callback
      (count, callback) ->
        count.should.be.equal 1
        connection.Event.find event0_id, callback
      (event0, callback) ->
        event0.id.should.be.equal event0_id
        should.not.exist event0.team_id
        callback null
    ], done

  it 'restrict', (done) ->
    connection.Team.hasMany connection.Event, integrity: 'restrict'
    connection.Event.belongsTo connection.Team

    team0_id = undefined

    async.waterfall [
      (callback) ->
        connection.manipulate [
          { create_team: id: 'team0', name: 'Croquis' }
          { create_event: id: 'event0', team_id: 'team0' }
          { create_event: id: 'event1', team_id: 'team0' }
        ], callback
      # try to delete but must fail
      (id_to_record_map, callback) ->
        team0_id = id_to_record_map.team0.id
        connection.Team.find(team0_id).delete (error) ->
          should.exist error
          error.message.should.be.equal 'rejected'
          callback null
      # not deleted
      (callback) ->
        connection.Team.find team0_id, callback
      (team, callback) ->
        team.name.should.be.equal 'Croquis'
        callback null
      # make no dependent records
      (callback) ->
        connection.Event.delete callback
      # can delete
      (count, callback) ->
        connection.Team.find(team0_id).delete callback
      (count, callback) ->
        count.should.be.equal 1
        callback null
    ], done

  it 'delete', (done) ->
    connection.Team.hasMany connection.Event, integrity: 'delete'
    connection.Event.belongsTo connection.Team

    connection.Comment.belongsTo connection.Event
    connection.Event.hasMany connection.Comment, integrity: 'delete'

    team0_id = undefined
    event1_id = undefined

    async.waterfall [
      (callback) ->
        connection.manipulate [
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
        connection.Team.find(team0_id).delete callback
      (count, callback) ->
        count.should.be.equal 1
        connection.Event.find event1_id, (error) ->
          should.exist error
          error.message.should.be.equal 'not found'
          callback null
      (callback) ->
        connection.Comment.where callback
      (records, callback) ->
        records.should.have.length 1
        records[0].content.should.be.equal 'First comment of event2'
        callback null
    ], done

  it 'nullfy by delete', (done) ->
    connection.Team.hasMany connection.Event, integrity: 'delete'
    connection.Event.belongsTo connection.Team

    connection.Comment.belongsTo connection.Event
    connection.Event.hasMany connection.Comment, integrity: 'nullify'

    team0_id = undefined
    event0_id = undefined
    comment0_id = undefined

    async.waterfall [
      (callback) ->
        connection.manipulate [
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
        connection.Team.find(team0_id).delete callback
      (count, callback) ->
        count.should.be.equal 1
        connection.Event.find event0_id, (error) ->
          should.exist error
          error.message.should.be.equal 'not found'
          callback null
      (callback) ->
        connection.Comment.find comment0_id, callback
      (comment, callback) ->
        comment.content.should.be.equal 'First comment of event0'
        should.not.exist comment.event_id
        callback null
    ], done

  it 'get inconsistencies', (done) ->
    events = undefined
    comments = undefined

    connection.Team.hasMany connection.Event
    connection.Event.belongsTo connection.Team

    connection.Comment.belongsTo connection.Event
    connection.Event.hasMany connection.Comment

    async.waterfall [
      (callback) ->
        connection.manipulate [
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
        connection.Team.find(id_to_record_map.team0.id).delete (error, count) ->
          connection.Event.find(id_to_record_map.event2.id).delete (error, count) ->
            callback error
      (callback) ->
        connection.getInconsistencies callback
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

    connection.Team.hasMany connection.Event, integrity: 'nullify'
    connection.Event.belongsTo connection.Team

    connection.Comment.belongsTo connection.Event
    connection.Event.hasMany connection.Comment

    async.waterfall [
      (callback) ->
        connection.manipulate [
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
        connection.Team.find(id_to_record_map.team0.id).delete (error, count) ->
          connection.Event.find(id_to_record_map.event2.id).delete (error, count) ->
            callback error
      (callback) ->
        connection.getInconsistencies callback
      (inconsistencies, callback) ->
        inconsistencies.should.have.keys 'Comment'

        inconsistencies.Comment.should.have.length 1
        inconsistencies.Comment[0].should.be.equal comments[0].id

        callback null
    ], done
