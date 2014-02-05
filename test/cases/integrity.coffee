async = require 'async'
{expect} = require 'chai'

module.exports = ->
  it 'ignore', (done) ->
    _g.connection.Team.hasMany _g.connection.Event
    _g.connection.Event.belongsTo _g.connection.Team

    team0_id = undefined
    event0_id = undefined

    async.waterfall [
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
        expect(count).to.equal 1
        _g.connection.Event.find event0_id, callback
      (event0, callback) ->
        expect(event0.id).to.equal event0_id
        expect(event0.team_id).to.equal team0_id
        callback null
    ], done

  it 'nullify (hasMany)', (done) ->
    _g.connection.Team.hasMany _g.connection.Event, integrity: 'nullify'
    _g.connection.Event.belongsTo _g.connection.Team

    team0_id = undefined
    event0_id = undefined

    async.waterfall [
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
        expect(count).to.equal 1
        _g.connection.Event.find event0_id, callback
      (event0, callback) ->
        expect(event0.id).to.equal event0_id
        expect(event0.team_id).to.not.exist
        callback null
    ], done

  it 'nullify (hasOne)', (done) ->
    _g.connection.Team.hasOne _g.connection.Event, integrity: 'nullify'
    _g.connection.Event.belongsTo _g.connection.Team

    team0_id = undefined
    event0_id = undefined

    async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_team: id: 'team0', name: 'Croquis' }
          { create_event: id: 'event0', team_id: 'team0' }
        ], callback
      (id_to_record_map, callback) ->
        team0_id = id_to_record_map.team0.id
        event0_id = id_to_record_map.event0.id
        _g.connection.Team.find(team0_id).delete callback
      (count, callback) ->
        expect(count).to.equal 1
        _g.connection.Event.find event0_id, callback
      (event0, callback) ->
        expect(event0.id).to.equal event0_id
        expect(event0.team_id).to.not.exist
        callback null
    ], done

  it 'restrict (hasMany)', (done) ->
    _g.connection.Team.hasMany _g.connection.Event, integrity: 'restrict'
    _g.connection.Event.belongsTo _g.connection.Team

    team0_id = undefined

    async.waterfall [
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
          expect(error).to.exist
          expect(error.message).to.equal 'rejected'
          callback null
      # not deleted
      (callback) ->
        _g.connection.Team.find team0_id, callback
      (team, callback) ->
        expect(team.name).to.equal 'Croquis'
        callback null
      # make no dependent records
      (callback) ->
        _g.connection.Event.delete callback
      # can delete
      (count, callback) ->
        _g.connection.Team.find(team0_id).delete callback
      (count, callback) ->
        expect(count).to.equal 1
        callback null
    ], done

  it 'restrict (hasOne)', (done) ->
    _g.connection.Team.hasOne _g.connection.Event, integrity: 'restrict'
    _g.connection.Event.belongsTo _g.connection.Team

    team0_id = undefined

    async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_team: id: 'team0', name: 'Croquis' }
          { create_event: id: 'event0', team_id: 'team0' }
        ], callback
      # try to delete but must fail
      (id_to_record_map, callback) ->
        team0_id = id_to_record_map.team0.id
        _g.connection.Team.find(team0_id).delete (error) ->
          expect(error).to.exist
          expect(error.message).to.equal 'rejected'
          callback null
      # not deleted
      (callback) ->
        _g.connection.Team.find team0_id, callback
      (team, callback) ->
        expect(team.name).to.equal 'Croquis'
        callback null
      # make no dependent records
      (callback) ->
        _g.connection.Event.delete callback
      # can delete
      (count, callback) ->
        _g.connection.Team.find(team0_id).delete callback
      (count, callback) ->
        expect(count).to.equal 1
        callback null
    ], done

  it 'delete (hasMany)', (done) ->
    _g.connection.Team.hasMany _g.connection.Event, integrity: 'delete'
    _g.connection.Event.belongsTo _g.connection.Team

    _g.connection.Comment.belongsTo _g.connection.Event
    _g.connection.Event.hasMany _g.connection.Comment, integrity: 'delete'

    team0_id = undefined
    event1_id = undefined

    async.waterfall [
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
        expect(count).to.equal 1
        _g.connection.Event.find event1_id, (error) ->
          expect(error).to.exist
          expect(error.message).to.equal 'not found'
          callback null
      (callback) ->
        _g.connection.Comment.where callback
      (records, callback) ->
        expect(records).to.have.length 1
        expect(records[0].content).to.equal 'First comment of event2'
        callback null
    ], done

  it 'delete (hasOne)', (done) ->
    _g.connection.Team.hasOne _g.connection.Event, integrity: 'delete'
    _g.connection.Event.belongsTo _g.connection.Team

    _g.connection.Comment.belongsTo _g.connection.Event
    _g.connection.Event.hasMany _g.connection.Comment, integrity: 'delete'

    team0_id = undefined
    event0_id = undefined

    async.waterfall [
      (callback) ->
        _g.connection.manipulate [
          { create_team: id: 'team0', name: 'Croquis' }
          { create_team: id: 'team1', name: 'Croquis' }
          { create_event: id: 'event0', team_id: 'team0' }
          { create_event: id: 'event1', team_id: 'team1' }
          { create_comment: event_id: 'event0', content: 'First comment of event0' }
          { create_comment: event_id: 'event0', content: 'Second comment of event0' }
          { create_comment: event_id: 'event1', content: 'First comment of event1' }
        ], callback
      (id_to_record_map, callback) ->
        team0_id = id_to_record_map.team0.id
        event0_id = id_to_record_map.event0.id
        _g.connection.Team.find(team0_id).delete callback
      (count, callback) ->
        expect(count).to.equal 1
        _g.connection.Event.find event0_id, (error) ->
          expect(error).to.exist
          expect(error.message).to.equal 'not found'
          callback null
      (callback) ->
        _g.connection.Comment.where callback
      (records, callback) ->
        expect(records).to.have.length 1
        expect(records[0].content).to.equal 'First comment of event1'
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

    async.waterfall [
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
        expect(count).to.equal 1
        _g.connection.Event.find event0_id, (error) ->
          expect(error).to.exist
          expect(error.message).to.equal 'not found'
          callback null
      (callback) ->
        _g.connection.Comment.find comment0_id, callback
      (comment, callback) ->
        expect(comment.content).to.equal 'First comment of event0'
        expect(comment.event_id).to.not.exist
        callback null
    ], done

  it 'get inconsistencies', (done) ->
    events = undefined
    comments = undefined

    _g.connection.Team.hasMany _g.connection.Event
    _g.connection.Event.belongsTo _g.connection.Team

    _g.connection.Comment.belongsTo _g.connection.Event
    _g.connection.Event.hasMany _g.connection.Comment

    async.waterfall [
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
        expect(inconsistencies).to.have.keys 'Event', 'Comment'

        expect(inconsistencies.Event).to.have.length 2
        inconsistencies.Event.sort (a, b) -> if a < b then -1 else 1
        events.sort (a, b) -> if a.id < b.id then -1 else 1
        expect(inconsistencies.Event[0]).to.equal events[0].id
        expect(inconsistencies.Event[1]).to.equal events[1].id

        expect(inconsistencies.Comment).to.have.length 1
        expect(inconsistencies.Comment[0]).to.equal comments[0].id

        callback null
    ], done

  it 'get inconsistencies (exclude null)', (done) ->
    comments = undefined

    _g.connection.Team.hasMany _g.connection.Event, integrity: 'nullify'
    _g.connection.Event.belongsTo _g.connection.Team

    _g.connection.Comment.belongsTo _g.connection.Event
    _g.connection.Event.hasMany _g.connection.Comment

    async.waterfall [
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
        expect(inconsistencies).to.have.keys 'Comment'

        expect(inconsistencies.Comment).to.have.length 1
        expect(inconsistencies.Comment[0]).to.equal comments[0].id

        callback null
    ], done
